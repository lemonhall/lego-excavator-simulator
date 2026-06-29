import type { GameInput } from "./state";

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private interactLatch = false;

  constructor(target: Window) {
    target.addEventListener("keydown", (event) => {
      this.pressed.add(event.code);
      if (event.code === "KeyE") {
        this.interactLatch = true;
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyE", "KeyQ", "KeyR"].includes(event.code)) {
        event.preventDefault();
      }
    });

    target.addEventListener("keyup", (event) => {
      this.pressed.delete(event.code);
    });
  }

  snapshot(): GameInput {
    const input: GameInput = {
      forward: this.pressed.has("KeyW") || this.pressed.has("ArrowUp"),
      backward: this.pressed.has("KeyS") || this.pressed.has("ArrowDown"),
      left: this.pressed.has("KeyA") || this.pressed.has("ArrowLeft"),
      right: this.pressed.has("KeyD") || this.pressed.has("ArrowRight"),
      jump: this.pressed.has("Space"),
      interact: this.interactLatch,
      boomUp: this.pressed.has("KeyR"),
      boomDown: this.pressed.has("KeyQ")
    };

    this.interactLatch = false;
    return input;
  }
}
