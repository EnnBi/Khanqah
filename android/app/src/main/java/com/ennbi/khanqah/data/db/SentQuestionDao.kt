package com.khanqah.app.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.khanqah.app.data.db.entities.SentQuestionEntity

@Dao
interface SentQuestionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(q: SentQuestionEntity)

    @Query("SELECT * FROM sent_questions WHERE threadId = :threadId")
    suspend fun forThread(threadId: String): List<SentQuestionEntity>

    @Query("SELECT * FROM sent_questions WHERE messageId = :id LIMIT 1")
    suspend fun byId(id: String): SentQuestionEntity?
}
