import os
import json
from dotenv import load_dotenv
from openai import OpenAI, AsyncOpenAI
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

SCRIPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Script")
MANIFEST_PATH = os.path.join(SCRIPT_DIR, "manifest.json")

def load_manifest():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

manifest = load_manifest()

NPC_DEFS = manifest["npcs"]
NPC_NAMES = [n["name"] for n in NPC_DEFS]
NPC_SECRETS = {n["name"]: n["core_secret"] for n in NPC_DEFS}
NPC_SCRIPT_MAP = {n["name"]: n["script_file"] for n in NPC_DEFS}
MURDERER_NAME = next(n["name"] for n in NPC_DEFS if n["is_murderer"])

app = FastAPI(title="AI剧本杀")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GameState:
    def __init__(self):
        self.reset()

    def reset(self):
        self.days = 1
        self.rounds = 0
        self.current_npc = manifest.get("first_npc", NPC_NAMES[0])
        self.game_over = False
        self.stories = []
        self.chat_history = {name: [] for name in NPC_NAMES}
        self.clues = []

    def to_dict(self):
        return {
            "days": self.days,
            "rounds": self.rounds,
            "current_npc": self.current_npc,
            "game_over": self.game_over,
            "stories": self.stories,
            "chat_history": self.chat_history,
            "clues": self.clues,
        }

game_state = GameState()

def read_npc_script(npc_name):
    script_file = NPC_SCRIPT_MAP.get(npc_name, "")
    file_path = os.path.join(SCRIPT_DIR, script_file)
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                return content
    return "此人没有任何外接经历记录。"

def call_llm_director(npc_name, player_input, stories):
    api_key = os.getenv("SF_API_KEY")
    base_url = os.getenv("SF_BASE_URL")

    if not api_key:
        return "（配置错误）未检测到 SF_API_KEY", "（无正文）", ""

    client = OpenAI(api_key=api_key, base_url=base_url)

    MODEL_NAME = os.getenv("SF_MODEL", "qwen-max")
    TEMPERATURE_SETTING = float(os.getenv("TEMPERATURE", "0.0"))

    npc_full_experience = read_npc_script(npc_name)
    current_secret = NPC_SECRETS.get(npc_name, "")
    story_context = flatten_stories(stories)

    prompt_template = manifest.get("npc_chat_prompt", "NPC回复：{player_input}\n正文：{player_input}")
    prompt = prompt_template.format(
        title=manifest["title"],
        npc_name=npc_name,
        day=game_state.days,
        core_secret=current_secret,
        npc_script=npc_full_experience,
        story_context=story_context,
        player_input=player_input,
    )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=TEMPERATURE_SETTING
        )
        output = response.choices[0].message.content
        thinking, reply, story = parse_llm_output(output)
        return thinking, reply, story, prompt
    except Exception as e:
        return "", f"（大模型断线: {str(e)}）", "寒风呼啸，大雪封山。", prompt

def call_search_llm(location_id, clue_text, npc_name):
    api_key = os.getenv("SF_API_KEY")
    base_url = os.getenv("SF_BASE_URL")
    if not api_key:
        return None
    client = OpenAI(api_key=api_key, base_url=base_url)
    MODEL_NAME = os.getenv("SF_MODEL", "qwen-max")
    TEMPERATURE_SETTING = float(os.getenv("TEMPERATURE", "0.0"))

    loc = next((l for l in manifest.get("search_locations", []) if l["id"] == location_id), None)
    loc_name = loc["name"] if loc else location_id
    loc_desc = f"{loc['floor']}的{loc['name']}，{loc['description']}" if loc else location_id
    story_context = flatten_stories(game_state.stories)

    prompt_template = manifest.get("search_story_prompt", "正文：{clue_text}")
    prompt = prompt_template.format(
        title=manifest["title"],
        location_name=loc_name,
        location_desc=loc_desc,
        day=game_state.days,
        story_context=story_context,
        clue_text=clue_text,
        npc_name=npc_name,
    )
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=TEMPERATURE_SETTING,
        )
        output = response.choices[0].message.content
        story = output.replace("正文：", "").strip()
        if not story:
            story = f"【搜索 {loc_name}】你在{loc_name}仔细搜索，{clue_text}"
        return story
    except Exception:
        return None

def has_undiscovered_clues(location_id):
    loc = next((l for l in manifest.get("search_locations", []) if l["id"] == location_id), None)
    if not loc:
        return False
    discovered = {c["clue"] for c in game_state.clues if c["location_id"] == location_id}
    return any(c not in discovered for c in loc.get("clues", []))

def get_search_from_manifest(location_id):
    loc = next((l for l in manifest.get("search_locations", []) if l["id"] == location_id), None)
    if not loc:
        return "", "（未知地点）"

    loc_name = loc["name"]
    loc_clues = loc.get("clues", [])
    discovered = {c["clue"] for c in game_state.clues if c["location_id"] == location_id}

    for clue_text in loc_clues:
        if clue_text not in discovered:
            scene = f"你在{loc_name}仔细搜索，{clue_text}"
            return scene, clue_text

    return f"你在{loc_name}仔细搜索了一遍，但没有发现更多线索。", "该房间暂时没有更多可发现的线索"

def parse_llm_output(text):
    thinking = ""
    reply = ""
    story = ""
    if "思考过程：" in text and "NPC回复：" in text:
        thinking = text.split("思考过程：", 1)[1].split("NPC回复：", 1)[0].strip()
    if "NPC回复：" in text:
        after_npc = text.split("NPC回复：", 1)[1]
        if "正文：" in after_npc:
            reply = after_npc.split("正文：", 1)[0].strip()
            story = after_npc.split("正文：", 1)[1].strip()
        else:
            reply = after_npc.strip()
            story = "空气仿佛凝固了，只有壁炉里的火在噼啪作响。"
    else:
        reply = text
        story = "空气仿佛凝固了，只有壁炉里的火在噼啪作响。"
    return thinking, reply, story

def make_story(story_text, thinking_text=""):
    return {"story": story_text, "thinking": thinking_text}

def flatten_stories(stories_list):
    texts = []
    for s in stories_list:
        if isinstance(s, dict):
            texts.append(s.get("story", ""))
        elif isinstance(s, str):
            texts.append(s)
    return "\n\n".join(texts) if texts else "（故事尚未开始）"

class ChatRequest(BaseModel):
    message: str

class SelectNPCRequest(BaseModel):
    npc_name: str

class AccuseRequest(BaseModel):
    target: str

class SearchRequest(BaseModel):
    location_id: str

class UndoResendRequest(BaseModel):
    npc_name: str
    message_index: int
    new_message: str

def advance_round():
    max_days = manifest["max_days"]
    rounds_per_day = manifest["rounds_per_day"]
    game_state.rounds += 1
    if game_state.rounds >= rounds_per_day:
        game_state.rounds = 0
        game_state.days += 1
        game_state.stories.append(
            make_story(manifest["day_transition"].replace("{day}", str(game_state.days)))
        )
    if game_state.days > max_days:
        game_state.game_over = True
        game_state.stories.append(make_story(manifest["timeout_message"]))
        return True
    return False

@app.get("/api/info")
def get_info():
    return {
        "title": manifest["title"],
        "description": manifest["description"],
        "max_days": manifest["max_days"],
        "rounds_per_day": manifest["rounds_per_day"],
        "npcs": [{"name": n["name"], "id": n["id"]} for n in NPC_DEFS],
        "timeline": manifest.get("timeline", []),
        "search_locations": manifest.get("search_locations", []),
    }

@app.get("/api/state")
def get_state():
    return game_state.to_dict()

@app.post("/api/new-game")
def new_game():
    game_state.reset()
    return game_state.to_dict()

@app.post("/api/chat")
def chat(req: ChatRequest):
    if game_state.game_over:
        return {"error": "游戏已结束"}

    # snapshot for undo
    snap = {
        "rounds": game_state.rounds,
        "days": game_state.days,
        "story_len": len(game_state.stories),
        "clue_len": len(game_state.clues),
        "npc": game_state.current_npc,
    }

    if advance_round():
        return {"game_over": True, "state": game_state.to_dict()}

    npc = game_state.current_npc
    thinking, reply, story, prompt = call_llm_director(npc, req.message, game_state.stories)

    game_state.chat_history[npc].append({"role": "player", "content": req.message, "_snap": snap})
    game_state.chat_history[npc].append({"role": "npc", "content": reply})
    game_state.stories.append(make_story(story, thinking))

    return {
        "reply": reply,
        "story": story,
        "prompt": prompt,
        "thinking": thinking,
        "state": game_state.to_dict(),
    }

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    if game_state.game_over:
        return {"error": "游戏已结束"}

    snap = {
        "rounds": game_state.rounds,
        "days": game_state.days,
        "story_len": len(game_state.stories),
        "clue_len": len(game_state.clues),
        "npc": game_state.current_npc,
    }

    if advance_round():
        async def gameover_stream():
            yield f"data: {json.dumps({'type': 'game_over', 'state': game_state.to_dict()})}\n\n"
        return StreamingResponse(gameover_stream(), media_type="text/event-stream")

    npc = game_state.current_npc

    api_key = os.getenv("SF_API_KEY")
    base_url = os.getenv("SF_BASE_URL")
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    MODEL_NAME = os.getenv("SF_MODEL", "qwen-max")
    TEMPERATURE_SETTING = float(os.getenv("TEMPERATURE", "0.0"))

    npc_full_experience = read_npc_script(npc)
    current_secret = NPC_SECRETS.get(npc, "")
    stories_for_prompt = game_state.stories
    story_context = flatten_stories(stories_for_prompt)

    prompt_template = manifest.get("npc_chat_prompt", "NPC回复：{player_input}\n正文：{player_input}")
    prompt = prompt_template.format(
        title=manifest["title"],
        npc_name=npc,
        day=game_state.days,
        core_secret=current_secret,
        npc_script=npc_full_experience,
        story_context=story_context,
        player_input=req.message,
    )

    async def generate():
        full_text = ""
        try:
            response = await client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=TEMPERATURE_SETTING,
                stream=True,
            )
            async for chunk in response:
                token = chunk.choices[0].delta.content or ""
                full_text += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'token', 'content': f'（大模型断线: {str(e)}）'})}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'content': '寒风呼啸，大雪封山。'})}\n\n"

        thinking, reply, story = parse_llm_output(full_text)

        game_state.chat_history[npc].append({"role": "player", "content": req.message, "_snap": snap})
        game_state.chat_history[npc].append({"role": "npc", "content": reply})
        game_state.stories.append(make_story(story, thinking))

        yield f"data: {json.dumps({'type': 'done', 'prompt': prompt, 'state': game_state.to_dict()})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/api/select-npc")
def select_npc(req: SelectNPCRequest):
    if req.npc_name in NPC_NAMES:
        game_state.current_npc = req.npc_name
    return game_state.to_dict()

@app.post("/api/accuse")
def accuse(req: AccuseRequest):
    game_state.game_over = True
    if req.target == MURDERER_NAME:
        msg = manifest["win_message"]
        win = True
    else:
        msg = manifest["lose_message"]
        win = False
    game_state.stories.append(make_story(msg))
    return {
        "win": win,
        "message": msg,
        "state": game_state.to_dict(),
    }

@app.post("/api/search")
def search(req: SearchRequest):
    if game_state.game_over:
        return {"error": "游戏已结束", "state": game_state.to_dict()}

    if not has_undiscovered_clues(req.location_id):
        loc = next((l for l in manifest.get("search_locations", []) if l["id"] == req.location_id), None)
        loc_name = loc["name"] if loc else req.location_id
        return {
            "scene": f"你在{loc_name}仔细搜索了一遍，但没有发现更多线索。",
            "clue": "该房间暂时没有更多可发现的线索",
            "story": f"【搜索 {loc_name}】你在{loc_name}仔细搜索了一遍，但没有发现更多线索。",
            "state": game_state.to_dict(),
        }

    if advance_round():
        return {"game_over": True, "state": game_state.to_dict()}

    scene, clue = get_search_from_manifest(req.location_id)
    loc = next((l for l in manifest.get("search_locations", []) if l["id"] == req.location_id), None)
    loc_name = loc["name"] if loc else req.location_id

    llm_story = call_search_llm(req.location_id, clue, game_state.current_npc)
    story = llm_story if llm_story else f"【搜索 {loc_name}】{scene}"

    game_state.clues.append({
        "location_id": req.location_id,
        "location_name": loc_name,
        "scene": scene,
        "clue": clue,
    })
    game_state.stories.append(make_story(story))

    return {
        "scene": scene,
        "clue": clue,
        "story": story,
        "state": game_state.to_dict(),
    }

@app.post("/api/undo-and-resend")
def undo_and_resend(req: UndoResendRequest):
    if game_state.game_over:
        return {"error": "游戏已结束"}

    history = game_state.chat_history.get(req.npc_name, [])
    if req.message_index < 0 or req.message_index >= len(history):
        return {"error": "消息索引无效"}
    msg = history[req.message_index]
    if msg.get("role") != "player":
        return {"error": "只能撤回自己的消息"}

    snap = msg.get("_snap")
    if snap is None:
        return {"error": "该消息无法撤回（缺少快照）"}

    # roll back state
    game_state.rounds = snap["rounds"]
    game_state.days = snap["days"]
    game_state.stories = game_state.stories[:snap["story_len"]]
    game_state.clues = game_state.clues[:snap.get("clue_len", len(game_state.clues))]
    game_state.current_npc = snap["npc"]
    game_state.chat_history[req.npc_name] = history[:req.message_index]

    # re-run LLM
    npc = req.npc_name
    thinking, reply, story, prompt = call_llm_director(npc, req.new_message, game_state.stories)

    # snapshot for next undos
    new_snap = {
        "rounds": game_state.rounds,
        "days": game_state.days,
        "story_len": len(game_state.stories),
        "clue_len": len(game_state.clues),
        "npc": npc,
    }
    game_state.chat_history[npc].append({"role": "player", "content": req.new_message, "_snap": new_snap})
    game_state.chat_history[npc].append({"role": "npc", "content": reply})
    game_state.stories.append(make_story(story, thinking))

    return {
        "reply": reply,
        "story": story,
        "thinking": thinking,
        "prompt": prompt,
        "state": game_state.to_dict(),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
