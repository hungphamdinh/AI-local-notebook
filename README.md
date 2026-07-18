# LocalNote AI

LocalNote AI is a standalone, local-first React Native application for importing documents, extracting or OCR-recognizing their text, taking notes, producing private on-device summaries, and asking citation-grounded questions.

## What works

- Bare React Native 0.86, strict TypeScript, iOS and Android.
- PDF, TXT, Markdown, and pasted-text import into private application storage.
- Native PDF text extraction per page.
- Automatic offline OCR fallback for scanned/empty PDF pages: Vision on iOS and bundled ML Kit on Android.
- Normalized SQLite schema with foreign keys, cascade deletion, FTS5 search, resumable-status fields, and binary embeddings.
- Section detection and overlapping token-aware chunks with source offsets.
- On-device GGUF inference and embeddings through `llama.rn`.
- Download progress, available-storage/RAM checks, SHA-256 verification, cancellation, unload and deletion.
- Hierarchical summary generation rather than truncating to the first chunks.
- Document-only semantic/keyword retrieval with validated citation IDs and insufficient-context fallback.
- Library, onboarding, import, overview, reader, notes/highlights, Ask, details, and settings screens.
- Reading and notes work without AI models.
- Optional Ollama provider for generation and embeddings on a configured local computer.

Document content is never sent to a cloud inference service. Internet permission is used only when the user explicitly downloads model files.

## Requirements

- Node.js 22.11 or newer
- Xcode with iOS toolchain and CocoaPods/Bundler
- Android Studio, Android SDK and JDK required by React Native 0.86
- A physical device is strongly recommended for model inference and OCR validation

## Install and run

For immediate Android device testing, build the self-contained internal release with `cd android && ./gradlew app:assembleRelease`. The APK is written to `android/app/build/outputs/apk/release/app-release.apk` and does not require Metro. The template release variant uses the React Native development key for internal testing only; replace it with your production keystore before distribution.

```bash
npm install
npm run typecheck
npm run lint
npm test
```

### iOS

```bash
cd ios
bundle install
bundle exec pod install
cd ..
npm run ios
```

The native PDF module uses PDFKit for embedded text and Vision accurate text recognition for pages without useful embedded text.

### Android

```bash
npm run android
```

Android uses PDFBox for embedded PDF text and the bundled ML Kit Latin text-recognition model for scanned pages. It does not need Google Play Services to download OCR at first use.

## Local models

Open Settings or use onboarding and choose a curated generation profile. Every profile also installs the Nomic retrieval model:

- **Lite:** Qwen3 0.6B Q4_0, about 409 MB, for the fastest multilingual generation.
- **Balanced (recommended):** Llama 3.2 1B Instruct Q4_K_M, about 770 MB.
- **Quality:** Qwen3 1.7B Q4_K_M, about 1.19 GB, for stronger devices.
- **Retrieval:** Nomic Embed Text v1.5 Q4_K_M, about 80 MB.

The app stores one active generation model and one active retrieval model. Settings can download, activate, cancel, or remove each model independently. Downloads are saved under private app Documents storage and verified against registry SHA-256 hashes before activation. Reading, OCR, search, and manual notes remain usable when models are absent.

## Ollama on your computer

Start Ollama and ensure `gemma4:latest` and `nomic-embed-text:latest` are installed. On onboarding, choose **Connect and continue with Ollama**. Android Emulator reaches the host at `http://10.0.2.2:11434`; iOS Simulator uses `http://127.0.0.1:11434`. For a physical device, enter the computer's LAN address and configure Ollama to listen on that interface.

Ollama mode sends only the excerpts required for embeddings, summaries, or questions to the configured computer. It never falls back to a cloud provider. Android release builds should use an HTTPS endpoint; local cleartext HTTP is enabled in debug builds for emulator development.

## Architecture

```text
src/
  ai/            model registry, llama.rn runtime, prompts, retrieval
  components/    accessible shared UI
  database/      migrations and repositories
  documents/     import, normalization, sections and chunks
  navigation/    typed React Navigation routes
  native/        typed PDF adapter boundary
  screens/       product screens
  services/      idempotent document and AI pipeline
  stores/        transient Zustand state
  tests/         focused unit and adapter tests
  types/         strict domain and error contracts
```

Large document bodies and embeddings stay in SQLite, not Zustand. Native inference and OCR do not execute on the JavaScript thread.

## Privacy and deletion

- Imported files are copied into private app storage.
- SQL is parameterized.
- Document text and prompts are not logged.
- Deleting a document cascades through sections, chunks, embeddings, summaries, notes, highlights and chats, then removes the copied source file.
- Deleting models unloads native contexts and removes model artifacts.
- There is no cloud AI provider or automatic network fallback. Ollama is an explicit local-network option.

## Current limitations

- OCR currently bundles the Latin-script recognizer on Android. Additional ML Kit script packages can be added behind the same adapter.
- Handwriting, damaged scans, unusual fonts and complex multi-column layouts can reduce OCR/text ordering quality.
- The mobile-sized models favor device compatibility over desktop-model quality.
- Model speed and memory limits vary by physical device; simulators are not representative.
- Background execution is persisted as processing state, but iOS may suspend CPU-heavy work when the app is backgrounded.

## Roadmap

- Add optional CJK/Devanagari OCR packs.
- Add optional multilingual embedding models after physical-device memory validation.
- Move long processing to platform background schedulers where OS policy permits.
- Add native selectable-text range callbacks for direct highlight creation.
- Add encrypted database mode with a Keychain/Keystore-managed key.

## Sample

Import [`samples/localnote-sample-document.md`](samples/localnote-sample-document.md), generate a summary, then ask: “What should happen when a source does not contain enough information?”
