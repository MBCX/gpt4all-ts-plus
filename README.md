# gpt4all-ts-plus

**GPT4All-ts-plus** is a modification of [the original gpt4-all-ts by nomic-ai](https://github.com/nomic-ai/gpt4all-ts). This modified
version allows you to use the [newest released models from nomic-ai and other models](https://github.com/nomic-ai/gpt4all/tree/main/gpt4all-chat#manual-download-of-models).

Thanks to [kuvaus's LlamaGPTJ-chat](https://github.com/kuvaus/LlamaGPTJ-chat), it is possible to use this models locally on your computer and in use them programatically with this API.

## Getting Started
**IMPORTANT:**
- [kuvaus's LlamaGPTJ-chat](https://github.com/kuvaus/LlamaGPTJ-chat) is in early development, keep that in mind when using this tool.
- As of now, this is not included as an npm package, so you'll have to manually installed it to your application. But it shouldn't be that much of an issue anyway. If you've used [GPT4All-ts](https://github.com/nomic-ai/gpt4all-ts), this behaves identically.

### 1. Installing the package.

Download the project as a .zip file using the code > local > Download ZIP.

### 2. Using the package.

It is as simple as:
```typescript
import { GPT4AllPlus } from "where/you/placed/gpt4allplus/gpt4allplus.ts";

const gpt4allp = new GPT4AllPlus(
    "modelName", // Specify model the name of the model from the list,
    "C:/Users/UserExample/nomic-ai" // (OPTIONAL) The direcory parent where the models and executable file are located. Don't add a "/" to the end.
);
```

### Example usage:
```typescript
import { GPT4AllPlus } from "where/you/placed/gpt4allplus/gpt4allplus.ts";

// Instance of GPT4Allplus.

// Get the list of all the available models.
const modelList = await GPT4AllPlus.listModels();
const gpt4allp = new GPT4AllPlus(modelList[0]);

// Download missing files.
await gpt4all.init();

// Open a connection with the model.
await gpt4all.open();

// Chat with it!
const response = await gtp4all.prompt("What is the meaning of life?")
console.log(response);

// Always close the connection when done.
await gpt4allp.close();
```

I must thank [Nomic AI](https://github.com/nomic-ai) and their team for their fantastic work at making powerful AI models that we can all use for free (most of them). Also thanks for the authors of [GPT4All-ts](https://github.com/nomic-ai/gpt4all-ts) for developing such tool!
