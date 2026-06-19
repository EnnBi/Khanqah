package com.khanqah.app.ui.qa

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.db.SentQuestionDao
import com.khanqah.app.data.db.entities.SentQuestionEntity
import com.khanqah.app.data.repository.DecryptedMessage
import com.khanqah.app.data.repository.QaRepository
import com.khanqah.app.data.repository.ShaykhKeyChangedException
import com.khanqah.app.qa.AudioPlayer
import com.khanqah.app.qa.UrduPipeline
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

data class ChatItem(
    val id: String,
    val fromMe: Boolean,
    val text: String,
    val hasAudio: Boolean,
    val audioRef: String?, val audioKeyB64: String?, val audioNonceB64: String?,
    val localAudioPath: String?,
    val createdAtIso: String,
    val read: Boolean,
    val durationSec: Int = 0,   // voice-note length shown on the bubble (own=cache, answer=envelope)
    // For answers: a quote of the question this replies to (WhatsApp-style). replyToId is set
    // whenever the answer references a question; text/isAudio come from our local sent cache.
    val replyToId: String? = null,
    val replyToText: String? = null,
    val replyToIsAudio: Boolean = false,
    val replyToDurationSec: Int = 0,
    val replyToCreatedAtMs: Long? = null,
)

/** A thread enriched for the list UI: status + locally-cached question preview + unread flag.
 *  The server can't read E2EE content, so [preview] comes from our own sent-question cache. */
data class ThreadRow(
    val id: String,
    val answered: Boolean,     // newest question answered (backend-computed)
    val lastMessageAt: String,
    val preview: String,
    val isAudio: Boolean,
    val unreadCount: Int,      // unseen answers; shown as a numeric badge until opened
    val seq: Int = 0,          // stable per-user question number (1 = earliest)
    val durationSec: Int = 0,  // voice-note length, for the list label
)

sealed interface SendState {
    data object Idle : SendState
    data object Preparing : SendState
    data object Sending : SendState
    data class Error(val message: String) : SendState
    data object Sent : SendState
}

class QaViewModel(
    private val repo: QaRepository,
    private val pipeline: UrduPipeline,
    private val dao: SentQuestionDao,
    val audioPlayer: AudioPlayer,
    private val prefs: QaPrefs,
) : ViewModel() {

    val threadRows = MutableStateFlow<List<ThreadRow>>(emptyList())
    val messages = MutableStateFlow<List<ChatItem>>(emptyList())
    val sendState: MutableStateFlow<SendState> = MutableStateFlow(SendState.Idle)

    fun loadThreads() = viewModelScope.launch {
        val list = runCatching { repo.listThreads() }.getOrNull() ?: return@launch
        // Stable question numbers: earliest-created thread is Q1, regardless of display order.
        val seqByThread = list.sortedBy { it.createdAt }
            .withIndex().associate { (i, t) -> t.id to (i + 1) }
        threadRows.value = list.map { t ->
            val original = dao.forThread(t.id).minByOrNull { it.createdAt }
            ThreadRow(
                id = t.id,
                // Chip reflects whether the newest question has been answered (backend-computed),
                // so a thread with a fresh reply reads "Answered" even if an earlier one is pending.
                answered = t.newestQuestionAnswered,
                lastMessageAt = t.lastMessageAt,
                preview = original?.text?.takeIf { it.isNotBlank() } ?: "",
                isAudio = original != null && original.text.isBlank() && original.audioPath != null,
                unreadCount = t.unreadAnswers,
                seq = seqByThread[t.id] ?: 0,
                durationSec = original?.durationSec ?: 0,
            )
        }
    }

    fun loadMessages(threadId: String) = viewModelScope.launch {
        val server = runCatching { repo.threadMessages(threadId) }.getOrDefault(emptyList())
        val cached = dao.forThread(threadId).associateBy { it.messageId }
        // For an answer, the quoted question is our own sent question → look it up by reply_to.
        messages.value = server.map { m -> toChatItem(m, cached[m.id], m.replyTo?.let { cached[it] }) }
        server.filter { it.direction == "a" && it.readAt == null }.forEach { runCatching { repo.markRead(it.id) } }
    }

    private fun toChatItem(m: DecryptedMessage, cache: SentQuestionEntity?, repliedTo: SentQuestionEntity?): ChatItem {
        val fromMe = m.direction == "q"
        return ChatItem(
            id = m.id, fromMe = fromMe,
            text = if (fromMe) (cache?.text ?: "") else m.text,
            hasAudio = if (fromMe) (cache?.audioPath != null) else (m.audioRef != null),
            audioRef = m.audioRef, audioKeyB64 = m.audioKeyB64, audioNonceB64 = m.audioNonceB64,
            localAudioPath = cache?.audioPath,
            createdAtIso = m.createdAt, read = m.readAt != null,
            durationSec = if (fromMe) (cache?.durationSec ?: 0) else m.durationSec,
            replyToId = m.replyTo,
            replyToText = repliedTo?.text?.takeIf { it.isNotBlank() },
            replyToIsAudio = repliedTo?.audioPath != null,
            replyToDurationSec = repliedTo?.durationSec ?: 0,
            replyToCreatedAtMs = repliedTo?.createdAt,
        )
    }

    fun sendTyped(name: String, phone: String, address: String, typed: String, threadId: String?) =
        viewModelScope.launch {
            try {
                sendState.value = SendState.Preparing
                val prepared = pipeline.prepare(typed)
                sendState.value = SendState.Sending
                val resp = if (prepared.audioBytes != null)
                    repo.sendAudioQuestion(name, phone, address, prepared.urduText, prepared.audioBytes!!, threadId)
                else
                    repo.sendTextQuestion(name, phone, address, prepared.urduText, threadId)
                dao.upsert(SentQuestionEntity(resp.id, resp.threadId, prepared.urduText, null, System.currentTimeMillis()))
                sendState.value = SendState.Sent
            } catch (e: ShaykhKeyChangedException) {
                sendState.value = SendState.Error("Hazrat's security key changed. Please contact support before sending.")
            } catch (e: Exception) {
                sendState.value = SendState.Error(e.message ?: "Failed to send")
            }
        }

    fun sendRecorded(name: String, phone: String, address: String, audioBytes: ByteArray, audioPath: String, durationSec: Int, threadId: String?) =
        viewModelScope.launch {
            try {
                sendState.value = SendState.Sending
                val resp = repo.sendAudioQuestion(name, phone, address, "", audioBytes, threadId)
                dao.upsert(SentQuestionEntity(resp.id, resp.threadId, "", audioPath, System.currentTimeMillis(), durationSec))
                sendState.value = SendState.Sent
            } catch (e: ShaykhKeyChangedException) {
                sendState.value = SendState.Error("Hazrat's security key changed. Please contact support before sending.")
            } catch (e: Exception) {
                sendState.value = SendState.Error(e.message ?: "Failed to send")
            }
        }

    /** Play/pause the clip for [item]. If it's already the loaded clip, toggle; otherwise
     *  fetch+decrypt its bytes and start. */
    fun onPlayPause(item: ChatItem) = viewModelScope.launch {
        if (audioPlayer.playback.value.key == item.id) {
            audioPlayer.toggle()
            return@launch
        }
        runCatching {
            val bytes = if (item.fromMe && item.localAudioPath != null)
                java.io.File(item.localAudioPath).readBytes()
            else
                repo.fetchAudio(item.audioRef!!, item.audioKeyB64!!, item.audioNonceB64!!)
            audioPlayer.start(item.id, bytes)
        }
    }

    fun seek(ms: Int) = audioPlayer.seekTo(ms)

    fun resetSend() { sendState.value = SendState.Idle }

    override fun onCleared() { audioPlayer.stop() }
}
