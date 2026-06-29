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
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "Space",
          "KeyE",
          "KeyQ",
          "KeyR",
          "KeyJ",
          "KeyL",
          "KeyT",
          "KeyG",
          "KeyY",
          "KeyH"
        ].includes(event.code)
      ) {
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
      boomDown: this.pressed.has("KeyQ"),
      upperLeft: this.pressed.has("KeyJ"),
      upperRight: this.pressed.has("KeyL"),
      stickIn: this.pressed.has("KeyT"),
      stickOut: this.pressed.has("KeyG"),
      bucketCurl: this.pressed.has("KeyY"),
      bucketDump: this.pressed.has("KeyH")
    };

    this.interactLatch = false;
    return input;
  }
}
