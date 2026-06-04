import { describe, it, expect } from "bun:test";
import { parseLlmOutput } from "../src/llm/parser";

describe("parseLlmOutput", () => {
  it("parses full output with all three sections", () => {
    const text = "思考过程：这个侦探在试探我。\nNPC回复：您好，侦探先生。\n正文：壁炉的火光映在管家疲惫的脸上。";
    const result = parseLlmOutput(text);
    expect(result.thinking).toBe("这个侦探在试探我。");
    expect(result.reply).toBe("您好，侦探先生。");
    expect(result.story).toBe("壁炉的火光映在管家疲惫的脸上。");
  });

  it("handles missing 思考过程", () => {
    const text = "NPC回复：我不清楚。\n正文：房间陷入沉默。";
    const result = parseLlmOutput(text);
    expect(result.thinking).toBe("");
    expect(result.reply).toBe("我不清楚。");
    expect(result.story).toBe("房间陷入沉默。");
  });

  it("handles missing 正文", () => {
    const text = "NPC回复：我没有更多的信息可以提供。";
    const result = parseLlmOutput(text);
    expect(result.thinking).toBe("");
    expect(result.reply).toBe("我没有更多的信息可以提供。");
    expect(result.story).toBe("空气仿佛凝固了，只有壁炉里的火在噼啪作响。");
  });

  it("handles no markers at all", () => {
    const text = "这是一段没有任何标记的文本。";
    const result = parseLlmOutput(text);
    expect(result.thinking).toBe("");
    expect(result.reply).toBe("这是一段没有任何标记的文本。");
    expect(result.story).toBe("空气仿佛凝固了，只有壁炉里的火在噼啪作响。");
  });

  it("handles multiline content", () => {
    const text = "思考过程：第一行\n第二行\n第三行\nNPC回复：侦探先生，\n让我想想。\n正文：第一段\n第二段";
    const result = parseLlmOutput(text);
    expect(result.thinking).toBe("第一行\n第二行\n第三行");
    expect(result.reply).toBe("侦探先生，\n让我想想。");
    expect(result.story).toBe("第一段\n第二段");
  });

  it("handles 思考过程 appearing only in body text (matches Python behavior)", () => {
    const text = "NPC回复：你说什么思考过程：很重要吗？\n正文：一切正常。";
    const result = parseLlmOutput(text);
    expect(result.reply).toBe("你说什么思考过程：很重要吗？");
    expect(result.story).toBe("一切正常。");
  });
});
