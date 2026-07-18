# Local-first document analysis

LocalNote AI stores imported documents and derived information in private application storage. Document text is not sent to a cloud inference service.

## Grounded answers

When a user asks a question, the application retrieves relevant chunks from the selected document. The language model receives only those chunks and the question. A displayed citation must match one of the retrieved chunk identifiers. If the retrieved text does not contain enough information, the application should say that the document does not provide enough information.

## Scanned documents

PDF pages with useful embedded text use native PDF extraction. Pages without useful embedded text are rendered and passed through on-device optical character recognition. OCR output can be imperfect for handwriting, damaged pages, unusual fonts, and complex layouts.

## Offline operation

After the language and embedding models are downloaded and verified, summaries and document questions run on the device. Reading, searching extracted text, and personal notes remain available when no AI model is installed.
