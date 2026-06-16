package com.khanqah.shaykh

import android.app.Application
import com.khanqah.shaykh.data.api.ApiClient
import com.khanqah.shaykh.data.api.TokenManager
import com.khanqah.shaykh.data.repository.*
import com.khanqah.shaykh.ui.auth.AuthViewModel
import com.khanqah.shaykh.ui.bugs.BugsViewModel
import com.khanqah.shaykh.ui.categories.CategoryViewModel
import com.khanqah.shaykh.ui.content.ContentViewModel
import com.khanqah.shaykh.ui.home.HomeViewModel
import com.khanqah.shaykh.ui.live.LiveViewModel
import com.khanqah.shaykh.ui.schedule.ScheduleViewModel
import com.khanqah.shaykh.ui.settings.SettingsViewModel
import com.khanqah.shaykh.ui.team.TeamViewModel
import com.khanqah.shaykh.ui.upload.UploadViewModel

class AdminApp : Application() {
    lateinit var tokenManager: TokenManager
    lateinit var authRepo: AuthRepository
    lateinit var authViewModel: AuthViewModel
    lateinit var contentViewModel: ContentViewModel
    lateinit var uploadViewModel: UploadViewModel
    lateinit var scheduleViewModel: ScheduleViewModel
    lateinit var liveViewModel: LiveViewModel
    lateinit var teamViewModel: TeamViewModel
    lateinit var bugsViewModel: BugsViewModel
    lateinit var categoryViewModel: CategoryViewModel
    lateinit var homeViewModel: HomeViewModel
    lateinit var settingsViewModel: SettingsViewModel

    override fun onCreate() {
        super.onCreate()
        BroadcastForegroundService.createChannel(this)
        tokenManager = TokenManager(this)
        val api = ApiClient(tokenManager).service
        val contentRepo = ContentAdminRepository(api)
        val scheduleRepo = ScheduleRepository(api)
        val bugRepo = BugRepository(api)

        authRepo = AuthRepository(api, tokenManager)
        authViewModel = AuthViewModel(authRepo)
        contentViewModel = ContentViewModel(contentRepo)
        uploadViewModel = UploadViewModel(UploadRepository(api, this))
        scheduleViewModel = ScheduleViewModel(scheduleRepo)
        liveViewModel = LiveViewModel(LiveRepository(api))
        teamViewModel = TeamViewModel(TeamRepository(api))
        bugsViewModel = BugsViewModel(bugRepo)
        categoryViewModel = CategoryViewModel(CategoryRepository(api))
        homeViewModel = HomeViewModel(contentRepo, scheduleRepo, bugRepo)
        settingsViewModel = SettingsViewModel(SettingsRepository(api))
    }
}
