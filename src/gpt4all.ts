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

export class GPT4All {
    #bot: ReturnType<typeof spawn> | null = null;
    #decoderConfig: Record<string, any>;
    #executablePath: string;
    #modelPath: string;

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

    static async listModels()
    {
        const modelNames = await fetch("https://raw.githubusercontent.com/MBCX/gpt4all-ts-plus/main/models.txt");
        const models = await modelNames.text();
        return models.split("\n");
    }

    // TODO: Implement a function to automatically
    // download the models if the user doesn't have them.
    async init()
    {

    }

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

    close()
    {
        return new Promise<boolean>((resolve, reject) => {
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
        })
    }

    prompt(prompt: string)
    {
        if (this.#bot == null)
        {
            throw new Error("Bot is not initialised");
        }

        this.#bot.stdin.write(prompt + "\n");
        return new Promise((resolve, reject) => {
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
                    reject("");
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