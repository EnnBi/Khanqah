package com.khanqah.app.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Plaintext of a question we sent — kept locally so the conversation shows our own side
 *  (questions are sealed to the Shaykh and can't be decrypted back from the server). */
@Entity(tableName = "sent_questions")
data class SentQuestionEntity(
    @PrimaryKey val messageId: String,
    val threadId: String,
    val text: String,
    val audioPath: String?,
    val createdAt: Long,
    val durationSec: Int = 0,
)
