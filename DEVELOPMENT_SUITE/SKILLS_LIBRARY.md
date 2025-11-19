# 🧠 Skills Library & Prompt Engineering

This document contains "Skills" (Prompt Patterns) that improve the Gemini Agent's performance in Blender.

## Skill 1: The "Pre-Flight Check"
**Problem**: The agent assumes the scene is empty and tries to create objects that already exist, causing name collisions (e.g., `Cube.001`).
**Solution**: Enforce an `inspect_graph` call *before* any generation.
**System Prompt Injection**:
> "Before taking any action, you must call `inspect_graph` to understand the current state of the scene."

## Skill 2: "Visual Anchoring"
**Problem**: The agent connects nodes mathematically correctly, but visually they are a mess (all at 0,0).
**Solution**: Instruct the agent to use `node.location`.
**Prompt**:
> "When adding nodes, assign `node.location = (x, y)` values. Space them out by 200 units horizontally."

## Skill 3: "Error Healing"
**Problem**: Blender API changes between versions (e.g., 3.6 -> 4.0 -> 4.5).
**Solution**: The "Try/Except/Report" pattern.
**Behavior**:
1.  Agent writes code.
2.  Code fails with `AttributeError`.
3.  Agent receives `stderr`.
4.  Agent analyzes `stderr` and re-writes code using a different property name.

## Skill 4: "Socket Identification"
**Problem**: Linking by name (`inputs['Geometry']`) is flaky if user language is not English or if names change.
**Solution**: Use `inputs[0]` (Index) or `identifier` (UUID) from the `inspect_graph` JSON.

## Skill 5: "The Thinking Budget"
**Problem**: Complex math tasks (Golden Spirals, Fractals) fail with simple models.
**Solution**: Use **Gemini 3 Pro** with `thinkingConfig`.
**Prompt**:
> "Calculate the positions using numpy first, then apply them in Blender."