package com.localnoteai

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import com.facebook.react.bridge.*
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.File
import java.util.concurrent.Executors

class LocalNotePdfModule(private val context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
  private val executor=Executors.newSingleThreadExecutor()
  override fun getName()="LocalNotePdfExtractor"

  @ReactMethod
  fun extractText(rawPath:String,promise:Promise){executor.execute{
    val path=rawPath.removePrefix("file://"); val file=File(path)
    if(!file.exists()){promise.reject("inaccessible_file","PDF does not exist.");return@execute}
    try{
      PDFBoxResourceLoader.init(context); val embedded=extractEmbedded(file); var usedOcr=false
      val pages=embedded.mapIndexed{index,text->if(text.trim().length>=20)text.trim() else {usedOcr=true;ocrPage(file,index)}}
      val array=Arguments.createArray();pages.forEach(array::pushString)
      promise.resolve(Arguments.createMap().apply{putArray("pages",array);putInt("pageCount",pages.size);putBoolean("usedOcr",usedOcr)})
    }catch(error:Throwable){promise.reject("extraction_failure",error.message,error)}
  }}

  private fun extractEmbedded(file:File):List<String>{PDDocument.load(file).use{doc->val stripper=PDFTextStripper();return(1..doc.numberOfPages).map{page->stripper.startPage=page;stripper.endPage=page;stripper.getText(doc)}}}
  private fun ocrPage(file:File,index:Int):String{
    val descriptor=ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY)
    try {
      PdfRenderer(descriptor).use{renderer->renderer.openPage(index).use{page->
        val scale=2;val bitmap=Bitmap.createBitmap(page.width*scale,page.height*scale,Bitmap.Config.ARGB_8888)
        page.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
        val recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        return try{Tasks.await(recognizer.process(InputImage.fromBitmap(bitmap,0))).text}finally{recognizer.close();bitmap.recycle()}
      }}
    } finally {
      descriptor.close()
    }
  }
}
