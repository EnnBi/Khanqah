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
) : ViewModel() {

    val questions = MutableStateFlow<List<IncomingQuestion>>(emptyList())
    val state = MutableStateFlow<QueueState>(QueueState.Loading)
    val answerState = MutableStateFlow<AnswerState>(AnswerState.Idle)

    fun load() = viewModelScope.launch {
        state.value = QueueState.Loading
        try {
            repo.ensureRegistered()
            val threads = repo.pendingThreads()
            val out = ArrayList<IncomingQuestion>()
            for (t in threads) runCatching { repo.openQuestion(t) }.getOrNull()?.let { out.add(it) }
            questions.value = out
            state.value = QueueState.Ready
        } catch (e: Exception) { state.value = QueueState.Error(e.message ?: "خرابی") }
    }

    fun playQuestion(q: IncomingQuestion) = viewModelScope.launch {
        if (q.audioRef == null || q.audioKeyB64 == null || q.audioNonceB64 == null) return@launch
        runCatching {
            val bytes = repo.fetchAudio(q.audioRef!!, q.audioKeyB64!!, q.audioNonceB64!!)
            audioPlayer.play(bytes)
        }
    }

    fun stopAudio() = audioPlayer.stop()

    fun sendAnswer(q: IncomingQuestion, audioBytes: ByteArray?, text: String) = viewModelScope.launch {
        answerState.value = AnswerState.Sending
        try {
            val thread = QaThreadDto(q.threadId, q.questionerUserId, "", "open", "", "")
            repo.sendAnswer(thread, text, audioBytes)
            questions.value = questions.value.filter { it.threadId != q.threadId }
            answerState.value = AnswerState.Sent
        } catch (e: Exception) { answerState.value = AnswerState.Error(e.message ?: "بھیجنے میں خرابی") }
    }

    fun resetAnswer() { answerState.value = AnswerState.Idle }
    override fun onCleared() { audioPlayer.stop() }
}
