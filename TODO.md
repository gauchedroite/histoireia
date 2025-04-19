## Todo

- Bonjour avec login
- Diriger l'histoire
    - Donner des objectifs à court terme
    - Chaos factor +/-
    - Suggestion à partir de random tables
- Output genre movie script


Background: Vidéos avec des QTE qui réagissent à l'histoire
- Écoute lorsque chat écrit du texte
- Lorsqu'on entre du texte
- Drivé par LLM (émotion, couleur, autre)

Types de vidéo
- Stop motion
- Creature (2D anim)


## My dev environment

Open four terminal sessions. From my home folder on the macos server, run

Ollama
- echo -n -e "\033]0;Ollama Server\007"
- OLLAMA_HOST=0.0.0.0:11434 ollama serve

Caddy
- echo -n -e "\033]0;Caddy Server\007"
- cd dev/histoireia && caddy run --watch

Express server
- echo -n -e "\033]0;Express Server\007"
- export OPENAI_API_KEY={openai api key}
- cd dev/histoireia/server && npm run dev

Typescript compiler
- echo -n -e "\033]0;Typescript Compiler\007"
- cd dev/histoireia/client && npm run dev


## Role of Caddy and Express

Caddy receives all https traffic and reverse proxies it to the http Express server on port 9340.

The Express server.ts serves the api and files from the public folder, with the exception of the /webfonts and /client/src paths which are handled by Caddy for reasons. The api served includes user state management and calls to llms (ollama and openai)


## To view Histoiria

`https://lebaudy.gauchedroite.com/histoireia/index.html`

From the internet, lebaudy.gauchedroite.com resolves to my router which forwards all https traffic to the macos server.

From my lan, lebaudy.gauchedroite.com resolves to the macos server.
