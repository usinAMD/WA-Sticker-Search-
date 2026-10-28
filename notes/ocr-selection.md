# OCR implementation notes

Checked 2026-10-28 while selecting the private, local OCR path.

- The `rn-mlkit-ocr` project README describes Google ML Kit OCR on-device, Latin and Devanagari script models, Android API 23+ compatibility, and an Expo config plugin with bundled-model support. Selected for native import so OCR can work offline after installation. Source: https://github.com/ahmeterenodaci/rn-mlkit-ocr/
- Google's ML Kit Text Recognition v2 documentation lists Devanagari and Latin among supported scripts and describes on-device text-structure recognition. Source: https://developers.google.com/ml-kit/vision/text-recognition/v2
- The older `@react-native-ml-kit/text-recognition` npm package also documents script selection, but the selected `rn-mlkit-ocr` package exposes the Expo plugin options needed for bundled native models. Source: https://www.npmjs.com/package/@react-native-ml-kit/text-recognition

Web OCR uses Tesseract.js in the browser worker with English and Hindi language data. Its default worker/core and language-data paths fetch the OCR code and models from jsDelivr on first use; first-time Web OCR is therefore not guaranteed to work offline. The selected sticker Blob and OCR processing remain in the browser, and neither image blobs nor extracted text are sent to the app server. The app still needs a native Android build and device check to verify the ML Kit config and SAF flow; Expo Web Preview cannot validate those native-only paths.
