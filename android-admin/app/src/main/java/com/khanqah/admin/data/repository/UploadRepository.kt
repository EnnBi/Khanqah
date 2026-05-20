package com.khanqah.admin.data.repository

import android.content.Context
import android.net.Uri
import com.khanqah.admin.data.api.AdminApiService
import com.khanqah.admin.data.model.Content
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okio.BufferedSink
import java.io.InputStream

class UploadRepository(private val api: AdminApiService, private val context: Context) {

    suspend fun uploadAndCreate(
        uri: Uri,
        filename: String,
        mimeType: String,
        titleEn: String,
        titleUr: String,
        type: String,
        categoryId: String,
        isVideo: Boolean,
        onProgress: (Int) -> Unit,
    ): Content = withContext(Dispatchers.IO) {
        val urlResp = api.getUploadUrl(mapOf("filename" to filename, "content_type" to mimeType))

        val inputStream: InputStream = context.contentResolver.openInputStream(uri)
            ?: throw Exception("Cannot open file")
        val bytes = inputStream.readBytes()
        inputStream.close()

        val client = OkHttpClient()
        val body = object : RequestBody() {
            override fun contentType() = mimeType.toMediaType()
            override fun contentLength() = bytes.size.toLong()
            override fun writeTo(sink: BufferedSink) {
                val total = bytes.size.toLong()
                var written = 0L
                val chunkSize = 8192
                var offset = 0
                while (offset < bytes.size) {
                    val end = minOf(offset + chunkSize, bytes.size)
                    sink.write(bytes, offset, end - offset)
                    written += (end - offset)
                    onProgress((written * 100 / total).toInt())
                    offset = end
                }
            }
        }
        val request = Request.Builder()
            .url(urlResp.uploadUrl)
            .put(body)
            .header("Content-Type", mimeType)
            .build()
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) throw Exception("Upload failed: ${response.code}")

        api.createContent(mapOf(
            "title_en" to titleEn,
            "title_ur" to titleUr,
            "type" to type,
            "category_id" to categoryId,
            "media_url" to urlResp.cdnUrl,
            "is_video" to isVideo,
            "file_size" to bytes.size,
        ))
    }
}
