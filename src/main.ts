import { Game, GameState } from './game';
import { loadHighscores, renderHighscores, saveHighscore } from './highscore';

const gl = document.getElementById('gl') as HTMLCanvasElement;
const hudCanvas = document.getElementById('hud') as HTMLCanvasElement;
const menuEl = document.getElementById('menu')!;
const pauseEl = document.getElementById('pause')!;
const overEl = document.getElementById('gameover')!;
const scoreline = document.getElementById('scoreline')!;
const hsTop = document.getElementById('highscores')!;
const hsGo = document.getElementById('go-highscores')!;

const btnStart = document.getElementById('btn-start')!;
const btnQuit = document.getElementById('btn-quit')!;
const btnResume = document.getElementById('btn-resume')!;
const btnMenuFromPause = document.getElementById('btn-menu-from-pause')!;
const btnAgain = document.getElementById('btn-again')!;
const btnMenu = document.getElementById('btn-menu')!;

renderHighscores(hsTop, loadHighscores());

const game = new Game(gl, hudCanvas, {
  onStateChange: (s: GameState, score: number) => {
    menuEl.classList.add('hidden');
    pauseEl.classList.add('hidden');
    overEl.classList.add('hidden');
    if (s === 'menu') {
      menuEl.classList.remove('hidden');
      renderHighscores(hsTop, loadHighscores());
    } else if (s === 'paused') {
      pauseEl.classList.remove('hidden');
    } else if (s === 'gameover') {
      scoreline.textContent = `SCORE: ${score.toLocaleString('en')}`;
      const list = saveHighscore(score, Math.max(1, game.enemies.wave));
      renderHighscores(hsGo, list);
      overEl.classList.remove('hidden');
    }
  },
});

btnStart.addEventListener('click', () => { game.audio.ensure(); game.startNew(); });
btnQuit.addEventListener('click', () => {
  try { window.close(); } catch {}
  alert('Zavři kartu pro ukončení.');
});
btnResume.addEventListener('click', () => game.setState('playing'));
btnMenuFromPause.addEventListener('click', () => game.setState('menu'));
btnAgain.addEventListener('click', () => game.startNew());
btnMenu.addEventListener('click', () => game.setState('menu'));

game.start();

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && game.state === 'paused') {
    game.setState('playing');
  }
});
