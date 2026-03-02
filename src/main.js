import { GameController } from "./controller.js";

const root = document.getElementById("app");
const controller = new GameController(root);
controller.init();

window.focalPointController = controller;
window.render_game_to_text = () => controller.getStateText();
window.advanceTime = (ms) => controller.advanceTime(ms);
