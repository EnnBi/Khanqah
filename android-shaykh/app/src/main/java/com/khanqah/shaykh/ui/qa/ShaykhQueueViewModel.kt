package com.khanqah.shaykh.ui.qa

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.shaykh.data.model.QaThreadDto
import com.khanqah.shaykh.data.repository.IncomingQuestion
import com.khanqah.shaykh.data.repository.ShaykhRepository
import com.khanqah.shaykh.qa.AudioPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

sealed interface QueueState { data object Loading: QueueState; data object Ready: QueueState; data class Error(val msg:String): QueueState }
sealed interface AnswerState { data object Idle: AnswerState; data object Sending: AnswerState; data object Sent: AnswerState; data class Error(val msg:String): AnswerState }

class ShaykhQueueViewModel(
    private val repo: ShaykhRepository,
    val audioPlayer: AudioPlayer,
    private val dismissStore: DismissStore,
) : ViewModel() {

    val questions = MutableStateFlow<List<IncomingQuestion>>(emptyList())
    val state = MutableStateFlow<QueueState>(QueueState.Loading)
    val answerState = MutableStateFlow<AnswerState>(AnswerState.Idle)

    /** messageId currently being fetched/decrypted (show a spinner on its play control). */
    val loadingKey = MutableStateFlow<String?>(null)
    // Decrypted audio cached per message so re-landing / replay is instant.
    private val audioCache = HashMap<String, ByteArray>()

    fun load() = viewModelScope.launch {
        state.value = QueueState.Loading
        try {
            repo.ensureRegistered()
            val threads = repo.pendingThreads()
            val out = ArrayList<IncomingQuestion>()
            for (t in threads) out += runCatching { repo.openThreadQuestions(t) }.getOrNull().orEmpty()
            val dismissed = dismissStore.load()
            // Oldest question first across all threads; hide ones Hazrat chose to leave.
            questions.value = out.filter { it.messageId !in dismissed }.sortedBy { it.createdAt }
            state.value = QueueState.Ready
        } catch (e: Exception) { state.value = QueueState.Error(e.message ?: "خرابی") }
    }

    private suspend fun fetchBytes(q: IncomingQuestion): ByteArray? {
        if (q.audioRef == null || q.audioKeyB64 == null || q.audioNonceB64 == null) return null
        audioCache[q.messageId]?.let { return it }
        loadingKey.value = q.messageId
        return try {
            runCatching { repo.fetchAudio(q.audioRef!!, q.audioKeyB64!!, q.audioNonceB64!!) }
                .getOrNull()?.also { audioCache[q.messageId] = it }
        } finally {
            if (loadingKey.value == q.messageId) loadingKey.value = null
        }
    }

    // The clip the user currently wants to hear. A fetch that finishes after the user has
    // moved on (rapid scrolling) is discarded instead of starting stale audio.
    @Volatile private var requestedKey: String? = null
    private var playJob: kotlinx.coroutines.Job? = null

    /** Always (re)start [q] from the beginning — used for auto-play when a card lands. */
    fun play(q: IncomingQuestion) {
        requestedKey = q.messageId
        playJob?.cancel()
        playJob = viewModelScope.launch {
            val bytes = fetchBytes(q) ?: return@launch
            if (requestedKey == q.messageId) audioPlayer.start(q.messageId, bytes)
        }
    }

    /** Toggle play/pause for [q]; if it isn't the loaded clip, start it. */
    fun onPlayPause(q: IncomingQuestion) {
        if (audioPlayer.playback.value.key == q.messageId) { audioPlayer.toggle(); return }
        requestedKey = q.messageId
        playJob?.cancel()
        playJob = viewModelScope.launch {
            val bytes = fetchBytes(q) ?: return@launch
            if (requestedKey == q.messageId) audioPlayer.start(q.messageId, bytes)
        }
    }

    fun seek(ms: Int) = audioPlayer.seekTo(ms)

    fun stopAudio() {
        requestedKey = null
        playJob?.cancel()
        audioPlayer.stop()
    }

    fun sendAnswer(q: IncomingQuestion, audioBytes: ByteArray?, text: String, durationSec: Int = 0) = viewModelScope.launch {
        answerState.value = AnswerState.Sending
        try {
            val thread = QaThreadDto(q.threadId, q.questionerUserId, "", "open", "", "")
            repo.sendAnswer(thread, q.messageId, text, audioBytes, durationSec)
            // Remove only the answered question, not the whole thread — other follow-ups remain.
            questions.value = questions.value.filter { it.messageId != q.messageId }
            answerState.value = AnswerState.Sent
        } catch (e: Exception) { answerState.value = AnswerState.Error(e.message ?: "بھیجنے میں خرابی") }
    }

    /** Leave a question ("چھوڑ دیں"): remember it on-device and drop it from the queue. */
    fun dismiss(q: IncomingQuestion) = viewModelScope.launch {
        dismissStore.add(q.messageId)
        if (audioPlayer.playback.value.key == q.messageId) audioPlayer.stop()
        questions.value = questions.value.filter { it.messageId != q.messageId }
    }

    fun resetAnswer() { answerState.value = AnswerState.Idle }
    override fun onCleared() { audioPlayer.stop() }
}
