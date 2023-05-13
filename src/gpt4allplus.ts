import { spawn } from "child_process";
import { homedir } from "os";

export type GPT_MODELS =
    "ggml-gpt4all-l13b-snoozy" |
    "ggml-gpt4all-j-v1.3-groovy" |
    "ggml-gpt4all-j-v1.2-jazzy" |
    "ggml-gpt4all-j-v1.1-breezy" |
    "ggml-gpt4all-j" |
    "ggml-vicuna-7b-1.1-q4_2" |
    "ggml-vicuna-13b-1.1-q4_2" |
    "ggml-stable-vicuna-13B.q4_2" |
    "ggml-wizardLM-7B.q4_2" |
    "ggml-mpt-7b-base" |
    "ggml-mpt-7b-instruct" |
    "ggml-mpt-7b-chat";

export class Gpt4AllPlus
{
    #bot: ReturnType<typeof spawn> | null = null;
    #decoderConfig: Record<string, any>;
    #executablePath: string;
    #modelPath: string;

    /**
     * @param model Model to be use from the list.
     * @param executablePath Where the executable binary for running the bot is located at? (default is C:/Users/YourUser/.nomic/gpt4all)
     * @param modelPath Where the model to use is located (default is C:/Users/YourUser/.nomic/models/MODEL_NAME.bin)
     * @param decoderConfig 
     */
    constructor(
        model: GPT_MODELS,
        executablePath = `${homedir()}/.nomic/gpt4all`,
        modelPath = `${homedir()}/.nomic/models/${model}.bin`,
        decoderConfig: Record<string, any> = {}
    )
    {
        this.#decoderConfig = decoderConfig;
        this.#executablePath = executablePath;
        this.#modelPath = modelPath;
    }

    /**
     * @returns A list of all available models
     */
    static async listModels()
    {
        const modelNames = await fetch("https://raw.githubusercontent.com/MBCX/gpt4all-ts-plus/main/models.txt");
        const models = await modelNames.text() as GPT_MODELS;
        return models.split("\n") as GPT_MODELS[];
    }

    // TODO: Implement a function to automatically
    // download the models if the user doesn't have them.
    async init() {}

    /**
     * Starts the chat programme in the background
     * and opens a connection with the bot.
     */
    async open()
    {
        if (this.#bot != null)
        {
            await this.close();
        }

        const spawnArgs = [
            this.#executablePath,
            "--model",
            this.#modelPath
        ];

        for (const [key, value] of Object.entries(this.#decoderConfig))
        {
            spawnArgs.push(`--${key}`, String(value));
        }

        this.#bot = spawn(
            spawnArgs[0],
            spawnArgs.slice(1),
            {
                stdio: ["pipe", "pipe", "ignore"]
            }
        );

        await new Promise<boolean>(resolve => {
            this.#bot.stdout.on("data", data => {
                if ((data as string).toString().includes(">"))
                {
                    resolve(true)
                }
            })
        })
    }

    /**
     * Closes a connection with the bot and frees
     * used resources on the user's computer.
     */
    close()
    {
        return new Promise<boolean>(resolve => {
            if (this.#bot == null)
            {
                resolve(true);
            }
            
            this.#bot.on("close", () => {
                this.#bot = null;
                resolve(true)
            });
    
            if (this.#bot != null)
            {
                this.#bot.kill();
            }
        });
    }

    /**
     * Ask the bot and get an answer back
     * @param prompt Question to be asked to the bot.
     * @returns The bot's answer to the question.
     */
    prompt(prompt: string)
    {
        if (this.#bot == null)
        {
            throw new Error("Bot is not initialised");
        }

        this.#bot.stdin.write(prompt + "\n");
        return new Promise<string | Error>((resolve, reject) => {
            let response = "";
            let timeoutID: NodeJS.Timeout;

            const terminateAndRespond = (finalResponse: string) => {
                this.#bot.stdout.removeAllListeners("error");
                this.#bot.stdout.removeAllListeners("data");

                let newResponse: string | string[] = finalResponse;
                try
                {
                    if (finalResponse.endsWith(">"))
                    {
                        newResponse = newResponse.slice(0, -1);
                    }
    
                    // Avoid weird rubbish text.
                    // finalResponse = finalResponse.split("[1m[32m[0m")[1];

                    // Some models include "\r" while others
                    // "\n". Generally, gpt4all models include
                    // the latter.
                    if (finalResponse.includes("\r"))
                    {
                        newResponse = finalResponse.split("\r").filter(t => {
                            return /[a-zA-z0-9`{}]/gm.test(t);
                        });
                    }
                    else if (finalResponse.includes("\n"))
                    {
                        newResponse = finalResponse.split("\n").filter(t => {
                            return /[a-zA-z0-9`{}]/gm.test(t);
                        });
                    }
    
                    if (Array.isArray(newResponse))
                    {
                        if (newResponse.length > 1)
                        {
                            newResponse = newResponse.join(" ");
                        }
                        else
                        {
                            newResponse = newResponse[0].trim();
                        }
                    }
                    else
                    {
                        newResponse = newResponse.trim();
                    }
                    resolve(newResponse);
                }
                catch
                {
                    // The bot has shutdown itself while
                    // answering (common issue in my case)
                    reject("Bot has shutdown out of nowhere!");
                }
            }

            this.#bot.stdout.on("data", (data: Buffer) => {
                const text = data.toString();

                if (timeoutID)
                {
                    clearTimeout(timeoutID);
                }

                if (text.includes(">"))
                {
                    terminateAndRespond(response);
                }
                else
                {
                    timeoutID = setTimeout(() => {
                        terminateAndRespond(response)
                    }, 16000);
                }
                response += text;
            });

            this.#bot.stdout.on("error", (e: Error) => {
                this.#bot.stdout.removeAllListeners("error");
                this.#bot.stdout.removeAllListeners("data");
                reject(e);
            });
        });
    }
}