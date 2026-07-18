import Foundation
import PDFKit
import React
import UIKit
import Vision

@objc(LocalNotePdfExtractor)
final class LocalNotePdfExtractor: NSObject {
  @objc
  func extractText(_ rawPath: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      autoreleasepool {
        let path = Self.normalizedPath(rawPath)
        guard let document = PDFDocument(url: URL(fileURLWithPath: path)) else {
          reject("inaccessible_file", "Unable to open PDF.", nil); return
        }
        var pages: [String] = []; var usedOcr = false
        for index in 0..<document.pageCount {
          guard let page = document.page(at: index) else { pages.append(""); continue }
          let embedded = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
          if embedded.count >= 20 { pages.append(embedded); continue }
          usedOcr = true
          do { pages.append(try Self.ocr(page: page)) }
          catch { pages.append(embedded) }
        }
        resolve(["pages": pages, "pageCount": document.pageCount, "usedOcr": usedOcr])
      }
    }
  }

  private static func ocr(page: PDFPage) throws -> String {
    let bounds = page.bounds(for: .mediaBox); let scale: CGFloat = 2
    let size = CGSize(width: max(1,bounds.width*scale), height: max(1,bounds.height*scale))
    let renderer = UIGraphicsImageRenderer(size: size)
    let image = renderer.image { context in
      UIColor.white.setFill(); context.fill(CGRect(origin: .zero, size: size))
      context.cgContext.translateBy(x: 0, y: size.height); context.cgContext.scaleBy(x: scale, y: -scale)
      page.draw(with: .mediaBox, to: context.cgContext)
    }
    guard let cgImage = image.cgImage else { return "" }
    let request = VNRecognizeTextRequest(); request.recognitionLevel = .accurate; request.usesLanguageCorrection = true
    try VNImageRequestHandler(cgImage: cgImage).perform([request])
    return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
  }

  private static func normalizedPath(_ raw: String) -> String {
    let decoded = raw.removingPercentEncoding ?? raw
    if let url = URL(string: decoded), url.isFileURL { return url.path }
    return decoded.replacingOccurrences(of: "file://", with: "")
  }
}
