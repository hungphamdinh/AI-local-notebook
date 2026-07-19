import React
import UIKit

@objc(LocalNoteBackgroundExecution)
final class LocalNoteBackgroundExecution: NSObject {
  private var taskIdentifier: UIBackgroundTaskIdentifier = .invalid

  @objc
  func start(_ label: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.endCurrentTask()
      self.taskIdentifier = UIApplication.shared.beginBackgroundTask(withName: label) { [weak self] in
        self?.endCurrentTask()
      }
      if self.taskIdentifier == .invalid {
        reject("background_start_failure", "iOS did not grant background execution time.", nil)
      } else {
        resolve(nil)
      }
    }
  }

  @objc
  func stop(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.endCurrentTask()
      resolve(nil)
    }
  }

  private func endCurrentTask() {
    guard taskIdentifier != .invalid else { return }
    UIApplication.shared.endBackgroundTask(taskIdentifier)
    taskIdentifier = .invalid
  }
}
