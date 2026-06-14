package com.khanqah.admin

import android.app.Application
import com.khanqah.admin.data.api.ApiClient
import com.khanqah.admin.data.api.TokenManager
import com.khanqah.admin.data.repository.*
import com.khanqah.admin.ui.auth.AuthViewModel
import com.khanqah.admin.ui.bugs.BugsViewModel
import com.khanqah.admin.ui.categories.CategoryViewModel
import com.khanqah.admin.ui.content.ContentViewModel
import com.khanqah.admin.ui.home.HomeViewModel
import com.khanqah.admin.ui.live.LiveViewModel
import com.khanqah.admin.ui.schedule.ScheduleViewModel
import com.khanqah.admin.ui.settings.SettingsViewModel
import com.khanqah.admin.ui.team.TeamViewModel
import com.khanqah.admin.ui.upload.UploadViewModel

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
