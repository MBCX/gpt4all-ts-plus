import { Readable } from "stream";

export declare class Gpt4AllPlus {
    constructor(
        model: "ggml-gpt4all-l13b-snoozy" |
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
        "ggml-mpt-7b-chat",
        modelsAndExecParentDir?: string,
        executablePath?: string,
        modelPath?: string,
        decoderConfig?: Record<string, any>
    );
    static listModels(): Promise<("ggml-gpt4all-l13b-snoozy" |
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
        "ggml-mpt-7b-chat")[]>;
    init(): Promise<void>;
    open(): Promise<boolean>;
    close(
        systemMessage: string,
        chatLogName: string,
        maxTokens: number
    ): Promise<boolean>;
    save(name: string, dir: string): Promise<boolean>;
    prompt(prompt: string): Readable;
}