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
)

/** A thread enriched for the list UI: status + locally-cached question preview + unread flag.
 *  The server can't read E2EE content, so [preview] comes from our own sent-question cache. */
data class ThreadRow(
    val id: String,
    val status: String,
    val lastMessageAt: String,
    val preview: String,
    val isAudio: Boolean,
    val unread: Boolean,
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
        val seen = prefs.loadSeenThreads()
        threadRows.value = list.map { t ->
            val original = dao.forThread(t.id).minByOrNull { it.createdAt }
            val answered = t.status.equals("answered", ignoreCase = true)
            ThreadRow(
                id = t.id,
                status = t.status,
                lastMessageAt = t.lastMessageAt,
                preview = original?.text?.takeIf { it.isNotBlank() } ?: "",
                isAudio = original != null && original.text.isBlank() && original.audioPath != null,
                unread = answered && !seen.contains(t.id),
            )
        }
    }

    /** Mark an answered thread as read once its conversation has been opened. */
    fun markThreadSeen(threadId: String) = viewModelScope.launch {
        prefs.markThreadSeen(threadId)
        threadRows.value = threadRows.value.map {
            if (it.id == threadId) it.copy(unread = false) else it
        }
    }

    fun loadMessages(threadId: String) = viewModelScope.launch {
        val server = runCatching { repo.threadMessages(threadId) }.getOrDefault(emptyList())
        val cached = dao.forThread(threadId).associateBy { it.messageId }
        messages.value = server.map { m -> toChatItem(m, cached[m.id]) }
        server.filter { it.direction == "a" && it.readAt == null }.forEach { runCatching { repo.markRead(it.id) } }
    }

    private fun toChatItem(m: DecryptedMessage, cache: SentQuestionEntity?): ChatItem {
        val fromMe = m.direction == "q"
        return ChatItem(
            id = m.id, fromMe = fromMe,
            text = if (fromMe) (cache?.text ?: "") else m.text,
            hasAudio = if (fromMe) (cache?.audioPath != null) else (m.audioRef != null),
            audioRef = m.audioRef, audioKeyB64 = m.audioKeyB64, audioNonceB64 = m.audioNonceB64,
            localAudioPath = cache?.audioPath,
            createdAtIso = m.createdAt, read = m.readAt != null,
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

    fun sendRecorded(name: String, phone: String, address: String, audioBytes: ByteArray, audioPath: String, threadId: String?) =
        viewModelScope.launch {
            try {
                sendState.value = SendState.Sending
                val resp = repo.sendAudioQuestion(name, phone, address, "", audioBytes, threadId)
                dao.upsert(SentQuestionEntity(resp.id, resp.threadId, "", audioPath, System.currentTimeMillis()))
                sendState.value = SendState.Sent
            } catch (e: ShaykhKeyChangedException) {
                sendState.value = SendState.Error("Hazrat's security key changed. Please contact support before sending.")
            } catch (e: Exception) {
                sendState.value = SendState.Error(e.message ?: "Failed to send")
            }
        }

    fun playAnswerAudio(item: ChatItem) = viewModelScope.launch {
        runCatching {
            val bytes = if (item.fromMe && item.localAudioPath != null)
                java.io.File(item.localAudioPath).readBytes()
            else
                repo.fetchAudio(item.audioRef!!, item.audioKeyB64!!, item.audioNonceB64!!)
            audioPlayer.play(bytes)
        }
    }

    fun resetSend() { sendState.value = SendState.Idle }

    override fun onCleared() { audioPlayer.stop() }
}
