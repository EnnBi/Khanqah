package com.ennbi.khanqah.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.ennbi.khanqah.data.db.entities.CategoryEntity
import com.ennbi.khanqah.data.db.entities.ContentEntity
import com.ennbi.khanqah.data.db.entities.SentQuestionEntity

@Database(entities = [ContentEntity::class, CategoryEntity::class, SentQuestionEntity::class], version = 5)
abstract class AppDatabase : RoomDatabase() {
    abstract fun contentDao(): ContentDao
    abstract fun categoryDao(): CategoryDao
    abstract fun sentQuestionDao(): SentQuestionDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        // Speaker (credit) on cached content. A real migration, so the sent-questions table survives.
        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE content ADD COLUMN creditEn TEXT")
                db.execSQL("ALTER TABLE content ADD COLUMN creditUr TEXT")
            }
        }

        fun getInstance(context: Context): AppDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(context, AppDatabase::class.java, "khanqah.db")
                    .addMigrations(MIGRATION_4_5)
                    .fallbackToDestructiveMigration()
                    .build().also { INSTANCE = it }
            }
    }
}
