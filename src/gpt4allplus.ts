import { exec, spawn } from "child_process";
import { createWriteStream, existsSync } from "fs";
import { access, appendFile, constants, mkdir, readdir, rm, writeFile } from "fs/promises";
import { homedir, platform } from "os";
import { promisify } from "util";

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
    #osName = platform();
    #modelName: GPT_MODELS;
    modelTemperature = 0.9;
    chatLogDirectory = "./chats";
    chatName = "";

    /**
     * @param model Model to be use from the list.
     * @param modelsAndExecParentDir (OPTIONAL) The direcory parent where the models and executable file are located (default is C:/Users/YourUser/.nomic)
     * @param executablePath (OPTIONAL) Where the executable binary for running the bot is located at? (default is modelsAndExecParentDir/gpt4all)
     * @param modelPath (OPTIONAL) Where the model to use is located (default is modelsAndExecParentDir/models/MODEL_NAME.bin)
     * @param decoderConfig (OPTIONAL)
     */
    constructor(
        model: GPT_MODELS,
        modelsAndExecParentDir = `file://${homedir()}/.nomic`,
        executablePath = `${modelsAndExecParentDir.includes("file://") ? modelsAndExecParentDir.split("file://")[1] : modelsAndExecParentDir}/gpt4all`,
        modelPath = `${modelsAndExecParentDir.includes("file://") ? modelsAndExecParentDir.split("file://")[1] : modelsAndExecParentDir}/models/${model}.bin`,
        decoderConfig: Record<string, any> = {}
    )
    {
        switch (platform())
        {
            case "win32":
                executablePath = executablePath.replace("gpt4all", "chat-windows-latest-avx2.exe");
            break;
            case "darwin":
                executablePath = executablePath.replace("gpt4all", "chat-macos-latest-avx2");
            break;
            case "linux":
                executablePath = executablePath.replace("gpt4all", "chat-ubuntu-latest-avx2");
            break;
        }
        this.#modelName = model;
        this.#decoderConfig = decoderConfig;
        this.#executablePath = executablePath;
        this.#modelPath = modelPath;
    }

    get modelName()
    {
        return this.#modelName;
    }

    set modelName(val: GPT_MODELS)
    {
        const oldModelPath = this.#modelPath;
        const pathSplit = oldModelPath.split(".bin");
        const oldModelName = pathSplit[0].split("/models/")[1];
        this.#modelName = val;
        this.#modelPath = pathSplit[0].replace(oldModelName, val) + ".bin";
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

    /**
     * Saves the chat and contents to a log file
     * @param dir Where to store this chat.
     * @param name Name of the chat
     * @param content Chat content to append to the file.
     * @param systemPrompt The prompt "instruction" to guide the AI to the right behaviour.
     * @param userContent The user's response or prompt.
     * @param assistantContent Assistant response.
     */
    static async saveChatContent(
        dir: string,
        name: string,
        systemPrompt: string,
        userContent: string,
        assistantContent: string
    )
    {
        const finalName = this.prototype.chatName === "" ? name : this.prototype.chatName;
        try {
            await access(dir, constants.F_OK);
        } catch (error) {
            await mkdir(dir);
        }
        const template = `\n### Instruction:\n${systemPrompt}\n### Prompt: ${userContent}\n### Response: ${assistantContent}\n`.trim();
        const appendChatContent = () => {
            appendFile(`${dir}/${finalName}.txt`, `\n${template}`);
        }
        this.prototype.chatLogDirectory = dir;

        if (existsSync(`${dir}/${finalName}.txt`))
        {
            appendChatContent();
        }
        else
        {
            await writeFile(`${dir}/${finalName}.txt`, template);
        }
    }

    static async deleteChats(dir: string)
    {
        try {
            await access(dir, constants.F_OK);
            readdir(dir).then(async files => {
                await Promise.all(files.map(f => rm(`${dir}/${f}`)));
            });
        } catch (error) {
            
        }
    }

    /**
     * Downloads the model you've picked to your computer.
     */
    async #downloadModel()
    {
        const modelURL = `https://gpt4all.io/models/${this.#modelName}.bin`;
        await this.#downloadFile(modelURL, this.#modelPath);

        console.log(`File downloaded successfully to ${this.#modelPath}`);
    }

    /**
     * Downloads the required chat executable from LlamaGPTJ-chat
     * for your platform.
     */
    async #downloadExecutable()
    {
        let url = "";
        switch (this.#osName)
        {
            case "darwin":
                url = "https://github.com/kuvaus/LlamaGPTJ-chat/releases/download/v0.1.8/chat-macos-latest-avx";
            break;
            case "linux":
                url = "https://github.com/kuvaus/LlamaGPTJ-chat/releases/download/v0.1.8/chat-ubuntu-latest-avx";
            break;
            case "win32":
                url = "https://github.com/kuvaus/LlamaGPTJ-chat/releases/download/v0.1.8/chat-windows-latest-avx.exe";
            break;
            default:
                throw `Your platform is not supported: ${platform}. Current binaries supported are for OSX (ARM and Intel), Linux and Windows.`
        }

        await this.#downloadFile(url, this.#executablePath);

        console.log(`File downloaded successfully to ${this.#executablePath}`);
    }

    /**
     * Downloads a file.
     * @param url URL of the thing to download
     * @param destination Where's going to be placed.
     */
    async #downloadFile(url: string, destination: string)
    {
        // const { data, headers } = await axios.get(url, { responseType: "stream" });
        // const totalSize = Number.parseInt(headers["content-length"], 10);
        // const progress = new ProgressBar("[:bar] :percent :etas", {
        //     complete: "=",
        //     incomplete: " ",
        //     width: 20,
        //     total: totalSize
        // });
        // const dir = new URL(this.#modelsAndExecParentDir);

        // try {
        //     await mkdir(dir, { recursive: true });
        // } catch (error) {
        //     throw error;
        // }
        // const writer = createWriteStream(destination);

        // data.on("data", (chunk: any[]) => {
        //     progress.tick(chunk.length);
        // });
        // data.pipe(writer);

        // return new Promise((resolve, reject) => {
        //     writer.on("finish", resolve)
        //     writer.on("error", reject);
        // })
    }

    /**
     * Download required files.
     * @param forceDownload Download the files again even if they're already on your computer?
     */
    async init(forceDownload = false)
    {
        const downloads = [] as Promise<void>[];

        if (forceDownload || !existsSync(this.#executablePath))
        {
            downloads.push(this.#downloadExecutable());
        }
        
        if (forceDownload || !existsSync(this.#modelPath))
        {
            downloads.push(this.#downloadModel());
        }

        await Promise.all(downloads);
    }

    /**
     * Starts the chat programme in the background
     * and opens a connection with the bot.
     * @param systemMessage An initial message modifing the behaviour of the assistant.
     * @param chatLogName Name of the chat log file, load to make the assistant remember the conversation.
     */
    async open(systemMessage = "", chatLogName = "")
    {
        const tokenAmount = String(10000);
        const chatLogPath = `${this.chatLogDirectory}/${chatLogName}.txt`;
        const chatLogExists = existsSync(chatLogPath);
        const modelNoTemplate = () => {
            return [
                this.#executablePath,
                "--model",
                this.#modelPath,
                "--no-animation",
                "--temp",
                String(this.modelTemperature),
                "-n",
                tokenAmount,
                "--load_log",
                chatLogExists ? chatLogPath : ""
            ];
        }
        const modelWithTemplate = () => {
            return [
                this.#executablePath,
                "--model",
                this.#modelPath,
                "--no-animation",
                "--temp",
                String(this.modelTemperature),
                "--load_template",
                promptTemplatePath,
                "-n",
                tokenAmount,
                "--load_log",
                chatLogExists ? chatLogPath : ""
            ];
        }

        if (this.#bot != null)
        {
            await this.close();
        }
        const systemMessageTemplate = `### Instruction:\n${systemMessage}\n### Prompt:\n%1\n### Response:`;
        const fileName = "promptTemplate";
        const promptTemplatePath = `./${fileName}.txt`;
        let spawnArgs = modelNoTemplate();

        if (
            systemMessage.trim() !== "" &&
            !existsSync(promptTemplatePath)
        )
        {
            try
            {
                await writeFile(promptTemplatePath, systemMessageTemplate);
                spawnArgs.length = 0;
                spawnArgs = modelWithTemplate();
            }
            catch (e)
            {
                console.error(
                    "Was not able to create system prompt file. It won't be possible to modify assistant behaviour.",
                    e
                );
            }
        }
        else if (existsSync(promptTemplatePath))
        {
            await writeFile(promptTemplatePath, systemMessageTemplate);
            spawnArgs = modelWithTemplate();
        }

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
        this.chatName = chatLogName;

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
                    const unknownCharFilter = /[a-zA-Z0-9`{}#-]/gm;
                    
                    if (finalResponse.endsWith(">"))
                    {
                        newResponse = newResponse.slice(0, -1);
                    }
    
                    // Avoid weird rubbish text.
                    // finalResponse = finalResponse.split("[1m[32m[0m")[1];

                    // Some models include "\r" while others
                    // "\n". Generally, gpt4all models include
                    // the latter. MPT-7B has this weird �.
                    if (finalResponse.includes("\r"))
                    {
                        newResponse = finalResponse.split("\r").filter(c => {
                            return unknownCharFilter.test(c);
                        });
                    }
                    else if (finalResponse.includes("\n"))
                    {
                        newResponse = finalResponse.split("\n").filter(c => {
                            return unknownCharFilter.test(c);
                        });
                    }
                    else if (finalResponse.includes("�"))
                    {
                        newResponse = finalResponse.split("�").filter(c => c !== "");
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
                catch (e)
                {
                    reject(e);
                }
            }

            this.#bot.stdout.on("data", (data: Buffer) => {
                const text = data.toString();

                if (timeoutID)
                {
                    clearTimeout(timeoutID);
                }

                timeoutID = setTimeout(() => {
                    terminateAndRespond(response)
                }, 4000);
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
