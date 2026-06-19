package com.khanqah.app.data.model

import com.google.gson.annotations.SerializedName

data class RegisterKeyRequest(
    @SerializedName("public_key") val publicKey: String,
    val algo: String = "x25519",
)
data class RegisterKeyResponse(val id: String)

data class ShaykhKeyResponse(
    @SerializedName("user_id") val userId: String,
    @SerializedName("key_id") val keyId: String,
    @SerializedName("public_key") val publicKey: String,
    val algo: String,
)

data class QaUploadRequest(@SerializedName("thread_id") val threadId: String = "")
data class QaUploadResponse(
    @SerializedName("upload_url") val uploadUrl: String,
    @SerializedName("file_key") val fileKey: String,
)

data class QaDownloadRequest(@SerializedName("file_key") val fileKey: String)
data class QaDownloadResponse(@SerializedName("download_url") val downloadUrl: String)

data class SendMessageRequest(
    @SerializedName("thread_id") val threadId: String? = null,
    val direction: String,
    @SerializedName("content_type") val contentType: String = "text",
    @SerializedName("ciphertext_inline") val ciphertextInline: String? = null,
    @SerializedName("ciphertext_ref") val ciphertextRef: String? = null,
    @SerializedName("enc_cek") val encCek: String,
    @SerializedName("nonce_key") val nonceKey: String,
    @SerializedName("nonce_payload") val noncePayload: String,
    @SerializedName("sender_key_id") val senderKeyId: String,
    @SerializedName("byte_size") val byteSize: Long = 0,
)
data class SendMessageResponse(
    val id: String,
    @SerializedName("thread_id") val threadId: String,
)

data class QaThreadDto(
    val id: String,
    @SerializedName("user_id") val userId: String,
    @SerializedName("shaykh_id") val shaykhId: String,
    val status: String,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("last_message_at") val lastMessageAt: String,
    @SerializedName("unread_answers") val unreadAnswers: Int = 0,
    @SerializedName("newest_question_answered") val newestQuestionAnswered: Boolean = false,
)

data class QaMessageDto(
    val id: String,
    @SerializedName("thread_id") val threadId: String,
    @SerializedName("sender_id") val senderId: String,
    @SerializedName("recipient_id") val recipientId: String,
    val direction: String,
    @SerializedName("content_type") val contentType: String,
    @SerializedName("ciphertext_ref") val ciphertextRef: String?,
    @SerializedName("ciphertext_inline") val ciphertextInline: String?,
    @SerializedName("enc_cek") val encCek: String,
    @SerializedName("nonce_key") val nonceKey: String,
    @SerializedName("nonce_payload") val noncePayload: String,
    @SerializedName("sender_key_id") val senderKeyId: String,
    @SerializedName("byte_size") val byteSize: Long,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("read_at") val readAt: String?,
    @SerializedName("reply_to") val replyTo: String? = null,
)
