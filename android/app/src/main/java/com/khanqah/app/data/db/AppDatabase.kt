package com.khanqah.app.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.khanqah.app.data.db.entities.CategoryEntity
import com.khanqah.app.data.db.entities.ContentEntity
import com.khanqah.app.data.db.entities.SentQuestionEntity

@Database(entities = [ContentEntity::class, CategoryEntity::class, SentQuestionEntity::class], version = 4)
abstract class AppDatabase : RoomDatabase() {
    abstract fun contentDao(): ContentDao
    abstract fun categoryDao(): CategoryDao
    abstract fun sentQuestionDao(): SentQuestionDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(context, AppDatabase::class.java, "khanqah.db")
                    .fallbackToDestructiveMigration()
                    .build().also { INSTANCE = it }
            }
    }
}
