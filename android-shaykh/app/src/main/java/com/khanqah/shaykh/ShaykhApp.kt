package com.khanqah.shaykh

import android.app.Application
import com.khanqah.shaykh.data.api.ApiClient
import com.khanqah.shaykh.data.api.TokenManager
import com.khanqah.shaykh.data.repository.AuthRepository
import com.khanqah.shaykh.data.repository.ShaykhRepository
import com.khanqah.shaykh.ui.auth.AuthViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ShaykhApp : Application() {
    lateinit var tokenManager: TokenManager
    lateinit var authRepo: AuthRepository
    lateinit var authViewModel: AuthViewModel
    lateinit var shaykhRepo: ShaykhRepository
    lateinit var makeQueueViewModel: () -> com.khanqah.shaykh.ui.qa.ShaykhQueueViewModel

    override fun onCreate() {
        super.onCreate()
        tokenManager = TokenManager(this)
        val apiClient = ApiClient(tokenManager)
        authRepo = AuthRepository(apiClient.service, tokenManager)
        authViewModel = AuthViewModel(authRepo)

        val identityKeyStore = com.khanqah.shaykh.crypto.IdentityKeyStore(this)
        val qaCrypto = com.khanqah.shaykh.crypto.QaCrypto(identityKeyStore)
        shaykhRepo = ShaykhRepository(apiClient.service, identityKeyStore, qaCrypto)

        val dismissStore = com.khanqah.shaykh.ui.qa.DismissStore(this)
        makeQueueViewModel = {
            com.khanqah.shaykh.ui.qa.ShaykhQueueViewModel(shaykhRepo, com.khanqah.shaykh.qa.AudioPlayer(this), dismissStore)
        }

        CoroutineScope(Dispatchers.IO).launch {
            if (authRepo.isLoggedIn()) onLoggedIn()
        }
    }

    fun onLoggedIn() {
        CoroutineScope(Dispatchers.IO).launch {
            val uid = tokenManager.getUserId()
            if (uid.isNotBlank()) com.google.firebase.messaging.FirebaseMessaging.getInstance().subscribeToTopic("user-$uid")
            runCatching { shaykhRepo.ensureRegistered() }
        }
    }
}
