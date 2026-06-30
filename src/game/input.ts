import type { GameInput } from "./state";

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private interactLatch = false;
  private modelBrowserLatch = false;
  private fireHeld = false;
  private lookDeltaX = 0;
  private lookDeltaY = 0;

  constructor(target: Window, pointerTarget?: HTMLElement) {
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

    target.addEventListener("mousemove", (event) => {
      if (pointerTarget && target.document.pointerLockElement !== pointerTarget) {
        return;
      }
      this.lookDeltaX += event.movementX;
      this.lookDeltaY += event.movementY;
    });

    pointerTarget?.addEventListener("click", () => {
      if (target.document.pointerLockElement !== pointerTarget) {
        void pointerTarget.requestPointerLock();
      }
    });

    pointerTarget?.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        this.fireHeld = true;
        event.preventDefault();
      }
    });

    target.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        this.fireHeld = false;
      }
    });

    pointerTarget?.addEventListener("contextmenu", (event) => {
      event.preventDefault();
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
      toggleModelBrowser: this.modelBrowserLatch,
      fire: this.fireHeld,
      lookDeltaX: this.lookDeltaX,
      lookDeltaY: this.lookDeltaY
    };

    this.interactLatch = false;
    this.modelBrowserLatch = false;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return input;
  }
}
