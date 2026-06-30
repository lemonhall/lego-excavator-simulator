import type { GameInput } from "./state";

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private interactLatch = false;
  private modelBrowserLatch = false;

  constructor(target: Window) {
    target.addEventListener("keydown", (event) => {
      this.pressed.add(event.code);
      if (event.code === "KeyE") {
        this.interactLatch = true;
      }
      if (event.code === "KeyB") {
        this.modelBrowserLatch = true;
      }
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "Space",
          "KeyE",
          "KeyU",
          "KeyO",
          "KeyJ",
          "KeyL",
          "KeyN",
          "KeyM",
          "KeyY",
          "KeyH",
          "KeyB"
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
      boomUp: this.pressed.has("KeyU"),
      boomDown: this.pressed.has("KeyO"),
      upperLeft: this.pressed.has("KeyJ"),
      upperRight: this.pressed.has("KeyL"),
      stickIn: this.pressed.has("KeyN"),
      stickOut: this.pressed.has("KeyM"),
      bucketCurl: this.pressed.has("KeyY"),
      bucketDump: this.pressed.has("KeyH"),
      toggleModelBrowser: this.modelBrowserLatch
    };

    this.interactLatch = false;
    this.modelBrowserLatch = false;
    return input;
  }
}
