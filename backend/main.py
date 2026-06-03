import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    story_context = "\n\n".join(stories) if stories else "（故事尚未开始）"

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

        if "正文：" in output:
            reply_part, story_part = output.split("正文：", 1)
            reply = reply_part.replace("NPC回复：", "").strip()
            story = story_part.strip()
        else:
            reply = output
            story = "空气仿佛凝固了，只有壁炉里的火在噼啪作响。"
        return reply, story, prompt
    except Exception as e:
        return f"（大模型断线: {str(e)}）", "寒风呼啸，大雪封山。", prompt

def call_llm_search(location_id):
    api_key = os.getenv("SF_API_KEY")
    base_url = os.getenv("SF_BASE_URL")
    if not api_key:
        return "【旁白】搜索毫无收获。", "（配置错误）", ""

    client = OpenAI(api_key=api_key, base_url=base_url)
    MODEL_NAME = os.getenv("SF_MODEL", "qwen-max")
    TEMPERATURE_SETTING = float(os.getenv("TEMPERATURE", "0.0"))

    loc = next((l for l in manifest.get("search_locations", []) if l["id"] == location_id), None)
    loc_name = loc["name"] if loc else location_id
    loc_desc = loc["description"] if loc else "未知地点"

    story_context = "\n\n".join(game_state.stories) if game_state.stories else "（故事尚未开始）"

    prompt_template = manifest.get("search_prompt", "场景描写：{location_name}\n获得线索：（无）")
    prompt = prompt_template.format(
        title=manifest["title"],
        day=game_state.days,
        location_name=loc_name,
        location_desc=loc_desc,
        clue_count=len(game_state.clues),
        story_context=story_context,
    )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=TEMPERATURE_SETTING
        )
        output = response.choices[0].message.content
        scene, clue = "", ""
        if "获得线索：" in output:
            parts = output.split("获得线索：", 1)
            scene = parts[0].replace("场景描写：", "").strip()
            clue = parts[1].strip()
        else:
            scene = output
            clue = "（什么也没有发现）"
        return scene, clue, prompt
    except Exception as e:
        return f"【旁白】在{loc_name}搜索时发生了意外。", f"（搜索中断: {str(e)}）", prompt

class ChatRequest(BaseModel):
    message: str

class SelectNPCRequest(BaseModel):
    npc_name: str

class AccuseRequest(BaseModel):
    target: str

class SearchRequest(BaseModel):
    location_id: str

def advance_round():
    max_days = manifest["max_days"]
    rounds_per_day = manifest["rounds_per_day"]
    game_state.rounds += 1
    if game_state.rounds >= rounds_per_day:
        game_state.rounds = 0
        game_state.days += 1
        game_state.stories.append(
            manifest["day_transition"].replace("{day}", str(game_state.days))
        )
    if game_state.days > max_days:
        game_state.game_over = True
        game_state.stories.append(manifest["timeout_message"])
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

    if advance_round():
        return {"game_over": True, "state": game_state.to_dict()}

    npc = game_state.current_npc
    reply, story, prompt = call_llm_director(npc, req.message, game_state.stories)

    game_state.chat_history[npc].append({"role": "player", "content": req.message})
    game_state.chat_history[npc].append({"role": "npc", "content": reply})
    game_state.stories.append(story)

    return {
        "reply": reply,
        "story": story,
        "prompt": prompt,
        "state": game_state.to_dict(),
    }

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
    game_state.stories.append(msg)
    return {
        "win": win,
        "message": msg,
        "state": game_state.to_dict(),
    }

@app.post("/api/search")
def search(req: SearchRequest):
    if game_state.game_over:
        return {"error": "游戏已结束", "state": game_state.to_dict()}

    if advance_round():
        return {"game_over": True, "state": game_state.to_dict()}

    scene, clue, prompt = call_llm_search(req.location_id)
    loc = next((l for l in manifest.get("search_locations", []) if l["id"] == req.location_id), None)
    loc_name = loc["name"] if loc else req.location_id
    story = f"【搜索 {loc_name}】{scene}"

    game_state.clues.append({
        "location_id": req.location_id,
        "location_name": loc_name,
        "scene": scene,
        "clue": clue,
    })
    game_state.stories.append(story)

    return {
        "scene": scene,
        "clue": clue,
        "story": story,
        "prompt": prompt,
        "state": game_state.to_dict(),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
