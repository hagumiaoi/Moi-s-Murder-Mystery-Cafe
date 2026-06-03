from openai import OpenAI
import os

def summarize_history(history, model="qwen-max"):
    api_key = os.getenv("SF_API_KEY")
    base_url = os.getenv("SF_BASE_URL")
    client = OpenAI(api_key=api_key, base_url=base_url)

    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in history])

    prompt = f"""
你是一个剧本杀记忆整理助手。请精简以下对话记录，提取出关于NPC性格、玩家怀疑点、以及已披露的关键线索。
要求：200字以内，逻辑客观，为后续对话提供背景参考。

对话记录：
{history_text}
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        return response.choices[0].message.content
    except:
        return "（记忆读取中...）"

def get_context_for_npc(history, limit=6):
    if len(history) <= limit:
        return "\n".join([f"{m['role']}: {m['content']}" for m in history])

    old_history = history[:-limit]
    recent_history = history[-limit:]

    summary = summarize_history(old_history)
    return f"【历史记忆总结】：{summary}\n\n【最近对话】：\n" + \
           "\n".join([f"{m['role']}: {m['content']}" for m in recent_history])
