//
//  FeedStatisticsTrackerTests.swift
//  FeedReaderCoreTests
//

import XCTest
@testable import FeedReaderCore

final class FeedStatisticsTrackerTests: XCTestCase {

    var tracker: FeedStatisticsTracker!
    let calendar = Calendar.current

    override func setUp() {
        super.setUp()
        tracker = FeedStatisticsTracker()
    }

    // MARK: - Helpers

    func makeArticle(feed: String = "https://example.com/feed",
                     link: String? = nil,
                     title: String = "Article",
                     date: Date? = nil,
                     wordCount: Int = 200,
                     isRead: Bool = false) -> TrackedArticle {
        return TrackedArticle(
            feedURL: feed,
            articleLink: link ?? "https://example.com/\(UUID().uuidString)",
            title: title,
            publishedDate: date,
            wordCount: wordCount,
            isRead: isRead
        )
    }

    func daysAgo(_ n: Int) -> Date {
        return calendar.date(byAdding: .day, value: -n, to: Date())!
    }

    // MARK: - Track Article

    func testTrackArticleSuccess() {
        let result = tracker.trackArticle(makeArticle())
        XCTAssertTrue(result)
        XCTAssertEqual(tracker.articleCount, 1)
    }

    func testTrackDuplicateArticle() {
        let a = makeArticle(link: "https://example.com/1")
        tracker.trackArticle(a)
        let result = tracker.trackArticle(a)
        XCTAssertFalse(result)
        XCTAssertEqual(tracker.articleCount, 1)
    }

    func testTrackMultipleArticles() {
        let count = tracker.trackArticles([
            makeArticle(link: "https://example.com/1"),
            makeArticle(link: "https://example.com/2"),
            makeArticle(link: "https://example.com/1")
        ])
        XCTAssertEqual(count, 2)
        XCTAssertEqual(tracker.articleCount, 2)
    }

    // MARK: - Read/Unread

    func testMarkAsRead() {
        tracker.trackArticle(makeArticle(link: "https://example.com/1"))
        XCTAssertTrue(tracker.markAsRead(articleLink: "https://example.com/1"))
        XCTAssertEqual(tracker.unreadCount, 0)
    }

    func testMarkAsReadNotFound() {
        XCTAssertFalse(tracker.markAsRead(articleLink: "https://nonexistent.com"))
    }

    func testMarkAsUnread() {
        tracker.trackArticle(makeArticle(link: "https://example.com/1", isRead: true))
        XCTAssertTrue(tracker.markAsUnread(articleLink: "https://example.com/1"))
        XCTAssertEqual(tracker.unreadCount, 1)
    }

    func testMarkAsUnreadNotFound() {
        XCTAssertFalse(tracker.markAsUnread(articleLink: "https://nonexistent.com"))
    }

    func testMarkAllAsRead() {
        let feed = "https://example.com/feed"
        tracker.trackArticle(makeArticle(feed: feed, link: "https://example.com/1"))
        tracker.trackArticle(makeArticle(feed: feed, link: "https://example.com/2"))
        tracker.trackArticle(makeArticle(feed: "https://other.com/feed", link: "https://other.com/1"))
        let count = tracker.markAllAsRead(feedURL: feed)
        XCTAssertEqual(count, 2)
        XCTAssertEqual(tracker.unreadCount, 1)
    }

    func testMarkAllAsReadSkipsAlreadyRead() {
        let feed = "https://example.com/feed"
        tracker.trackArticle(makeArticle(feed: feed, link: "https://example.com/1", isRead: true))
        tracker.trackArticle(makeArticle(feed: feed, link: "https://example.com/2"))
        let count = tracker.markAllAsRead(feedURL: feed)
        XCTAssertEqual(count, 1)
    }

    // MARK: - Remove

    func testRemoveArticlesByFeed() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1"))
        let removed = tracker.removeArticles(feedURL: "https://a.com/feed")
        XCTAssertEqual(removed, 1)
        XCTAssertEqual(tracker.articleCount, 1)
    }

    func testRemoveAllArticles() {
        tracker.trackArticle(makeArticle(link: "https://example.com/1"))
        tracker.trackArticle(makeArticle(link: "https://example.com/2"))
        tracker.removeAllArticles()
        XCTAssertEqual(tracker.articleCount, 0)
    }

    // MARK: - Get Articles

    func testGetArticlesAll() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1"))
        XCTAssertEqual(tracker.getArticles().count, 2)
    }

    func testGetArticlesByFeed() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1"))
        XCTAssertEqual(tracker.getArticles(feedURL: "https://a.com/feed").count, 1)
    }

    func testGetUnreadArticles() {
        tracker.trackArticle(makeArticle(link: "https://example.com/1", isRead: true))
        tracker.trackArticle(makeArticle(link: "https://example.com/2", isRead: false))
        XCTAssertEqual(tracker.getUnreadArticles().count, 1)
    }

    func testGetUnreadArticlesByFeed() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1", isRead: true))
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/2", isRead: false))
        XCTAssertEqual(tracker.getUnreadArticles(feedURL: "https://a.com/feed").count, 1)
    }

    // MARK: - Feed Name Registration

    func testRegisterFeedName() {
        let feed = "https://example.com/feed"
        tracker.registerFeedName("Example Feed", forURL: feed)
        tracker.trackArticle(makeArticle(feed: feed, link: "https://example.com/1"))
        let stats = tracker.statsForFeed(url: feed)
        XCTAssertEqual(stats?.feedName, "Example Feed")
    }

    func testFeedNameDefaultsToURL() {
        let feed = "https://example.com/feed"
        tracker.trackArticle(makeArticle(feed: feed, link: "https://example.com/1"))
        let stats = tracker.statsForFeed(url: feed)
        XCTAssertEqual(stats?.feedName, feed)
    }

    // MARK: - Per-Feed Stats

    func testStatsForFeedNonexistent() {
        XCTAssertNil(tracker.statsForFeed(url: "https://nonexistent.com"))
    }

    func testStatsForFeedBasic() {
        let feed = "https://example.com/feed"
        tracker.trackArticle(makeArticle(feed: feed, link: "https://e.com/1", wordCount: 100, isRead: true))
        tracker.trackArticle(makeArticle(feed: feed, link: "https://e.com/2", wordCount: 300, isRead: false))

        let stats = tracker.statsForFeed(url: feed)!
        XCTAssertEqual(stats.totalArticles, 2)
        XCTAssertEqual(stats.readArticles, 1)
        XCTAssertEqual(stats.unreadArticles, 1)
        XCTAssertEqual(stats.readPercentage, 50.0)
        XCTAssertEqual(stats.totalWordCount, 400)
        XCTAssertEqual(stats.averageWordCount, 200.0)
    }

    func testStatsForFeedWithDates() {
        let feed = "https://example.com/feed"
        tracker.trackArticle(makeArticle(feed: feed, link: "https://e.com/1", date: daysAgo(10)))
        tracker.trackArticle(makeArticle(feed: feed, link: "https://e.com/2", date: daysAgo(0)))

        let stats = tracker.statsForFeed(url: feed)!
        XCTAssertNotNil(stats.oldestArticleDate)
        XCTAssertNotNil(stats.newestArticleDate)
        XCTAssertGreaterThan(stats.estimatedArticlesPerDay, 0)
    }

    func testStatsReadingTime() {
        let feed = "https://example.com/feed"
        tracker.trackArticle(makeArticle(feed: feed, link: "https://e.com/1", wordCount: 238))
        let stats = tracker.statsForFeed(url: feed)!
        XCTAssertEqual(stats.estimatedReadingTimeMinutes, 1.0, accuracy: 0.01)
    }

    func testStatsCaseInsensitiveFeedURL() {
        tracker.trackArticle(makeArticle(feed: "HTTPS://EXAMPLE.COM/FEED", link: "https://e.com/1"))
        let stats = tracker.statsForFeed(url: "https://example.com/feed")
        XCTAssertNotNil(stats)
    }

    // MARK: - Frequency Label

    func testFrequencyLabelVeryHigh() {
        let feed = "https://example.com/feed"
        let now = Date()
        for i in 0..<20 {
            tracker.trackArticle(makeArticle(feed: feed, link: "https://e.com/\(i)",
                                             date: now.addingTimeInterval(Double(-i) * 3600)))
        }
        let stats = tracker.statsForFeed(url: feed)!
        XCTAssertTrue(["Very High", "High", "Daily"].contains(stats.frequencyLabel))
    }

    func testFrequencyLabelUnknown() {
        let feed = "https://example.com/feed"
        tracker.trackArticle(makeArticle(feed: feed, link: "https://e.com/1"))
        let stats = tracker.statsForFeed(url: feed)!
        XCTAssertEqual(stats.frequencyLabel, "Unknown")
    }

    // MARK: - All Feed Stats

    func testAllFeedStats() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/2"))

        let all = tracker.allFeedStats()
        XCTAssertEqual(all.count, 2)
        XCTAssertEqual(all[0].feedURL, "https://b.com/feed")
    }

    func testAllFeedStatsEmpty() {
        XCTAssertTrue(tracker.allFeedStats().isEmpty)
    }

    // MARK: - Overall Stats

    func testOverallStats() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1", wordCount: 100, isRead: true))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1", wordCount: 200))

        let overall = tracker.overallStats()
        XCTAssertEqual(overall.totalFeeds, 2)
        XCTAssertEqual(overall.totalArticles, 2)
        XCTAssertEqual(overall.totalRead, 1)
        XCTAssertEqual(overall.totalUnread, 1)
        XCTAssertEqual(overall.totalWordCount, 300)
        XCTAssertEqual(overall.readPercentage, 50.0)
    }

    func testOverallStatsBusiestFeed() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/2"))

        let overall = tracker.overallStats()
        XCTAssertEqual(overall.busiestFeedURL, "https://b.com/feed")
        XCTAssertEqual(overall.quietestFeedURL, "https://a.com/feed")
    }

    func testOverallStatsEmpty() {
        let overall = tracker.overallStats()
        XCTAssertEqual(overall.totalFeeds, 0)
        XCTAssertEqual(overall.totalArticles, 0)
        XCTAssertEqual(overall.readPercentage, 0)
    }

    // MARK: - Daily Digest

    func testDailyDigestForDate() {
        let today = Date()
        tracker.trackArticle(makeArticle(link: "https://e.com/1", date: today, wordCount: 500))
        tracker.trackArticle(makeArticle(link: "https://e.com/2", date: today, wordCount: 100))
        tracker.trackArticle(makeArticle(link: "https://e.com/3", date: daysAgo(5)))

        let digest = tracker.dailyDigest(for: today)
        XCTAssertEqual(digest.articleCount, 2)
        XCTAssertEqual(digest.topArticles.first?.wordCount, 500)
    }

    func testDailyDigestEmptyDay() {
        let digest = tracker.dailyDigest(for: Date())
        XCTAssertEqual(digest.articleCount, 0)
        XCTAssertTrue(digest.feedBreakdown.isEmpty)
    }

    func testDailyDigestFeedBreakdown() {
        let today = Date()
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1", date: today))
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/2", date: today))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1", date: today))

        let digest = tracker.dailyDigest(for: today)
        XCTAssertEqual(digest.feedBreakdown.count, 2)
        XCTAssertEqual(digest.feedBreakdown[0].count, 2)
    }

    func testDailyDigestTopArticlesCapped() {
        let today = Date()
        for i in 0..<10 {
            tracker.trackArticle(makeArticle(link: "https://e.com/\(i)", date: today, wordCount: i * 100))
        }
        let digest = tracker.dailyDigest(for: today)
        XCTAssertEqual(digest.topArticles.count, 5)
    }

    // MARK: - Recent Digests

    func testRecentDigests() {
        tracker.trackArticle(makeArticle(link: "https://e.com/1", date: daysAgo(0)))
        tracker.trackArticle(makeArticle(link: "https://e.com/2", date: daysAgo(2)))

        let digests = tracker.recentDigests(days: 7)
        XCTAssertEqual(digests.count, 2)
    }

    func testRecentDigestsZeroDays() {
        tracker.trackArticle(makeArticle(link: "https://e.com/1", date: Date()))
        let digests = tracker.recentDigests(days: 0)
        XCTAssertTrue(digests.isEmpty)
    }

    func testRecentDigestsNegativeDays() {
        let digests = tracker.recentDigests(days: -5)
        XCTAssertTrue(digests.isEmpty)
    }

    // MARK: - Feed Ranking

    func testRankByTotalArticles() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/2"))

        let ranked = tracker.rankFeeds(by: .totalArticles)
        XCTAssertEqual(ranked.first, "https://b.com/feed")
    }

    func testRankByUnreadCount() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1", isRead: true))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1"))

        let ranked = tracker.rankFeeds(by: .unreadCount)
        XCTAssertEqual(ranked.first, "https://b.com/feed")
    }

    func testRankByReadPercentage() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1", isRead: true))
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/2", isRead: true))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1", isRead: false))

        let ranked = tracker.rankFeeds(by: .readPercentage)
        XCTAssertEqual(ranked.first, "https://a.com/feed")
    }

    func testRankByAverageWordCount() {
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1", wordCount: 100))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1", wordCount: 500))

        let ranked = tracker.rankFeeds(by: .averageWordCount)
        XCTAssertEqual(ranked.first, "https://b.com/feed")
    }

    func testRankEmpty() {
        XCTAssertTrue(tracker.rankFeeds(by: .totalArticles).isEmpty)
    }

    // MARK: - Stale Feed Detection

    func testStaleFeedsDetectsOldFeeds() {
        tracker.trackArticle(makeArticle(feed: "https://stale.com/feed", link: "https://s.com/1", date: daysAgo(30)))
        tracker.trackArticle(makeArticle(feed: "https://fresh.com/feed", link: "https://f.com/1", date: daysAgo(1)))

        let stale = tracker.staleFeeds(threshold: 7 * 86400)
        XCTAssertTrue(stale.contains("https://stale.com/feed"))
        XCTAssertFalse(stale.contains("https://fresh.com/feed"))
    }

    func testStaleFeedsNoDatesTreatedAsStale() {
        tracker.trackArticle(makeArticle(feed: "https://nodate.com/feed", link: "https://n.com/1"))
        let stale = tracker.staleFeeds()
        XCTAssertTrue(stale.contains("https://nodate.com/feed"))
    }

    func testStaleFeedsEmpty() {
        XCTAssertTrue(tracker.staleFeeds().isEmpty)
    }

    func testStaleFeedsCustomThreshold() {
        tracker.trackArticle(makeArticle(feed: "https://example.com/feed", link: "https://e.com/1", date: daysAgo(3)))

        let stale1 = tracker.staleFeeds(threshold: 2 * 86400)
        XCTAssertTrue(stale1.contains("https://example.com/feed"))

        let stale2 = tracker.staleFeeds(threshold: 10 * 86400)
        XCTAssertFalse(stale2.contains("https://example.com/feed"))
    }

    // MARK: - Text Report

    func testTextReportNotEmpty() {
        tracker.trackArticle(makeArticle(link: "https://e.com/1", wordCount: 500))
        let report = tracker.textReport()
        XCTAssertTrue(report.contains("Feed Statistics Report"))
        XCTAssertTrue(report.contains("Total articles: 1"))
    }

    func testTextReportEmpty() {
        let report = tracker.textReport()
        XCTAssertTrue(report.contains("Total articles: 0"))
    }

    func testTextReportMultipleFeeds() {
        tracker.registerFeedName("Feed A", forURL: "https://a.com/feed")
        tracker.trackArticle(makeArticle(feed: "https://a.com/feed", link: "https://a.com/1"))
        tracker.trackArticle(makeArticle(feed: "https://b.com/feed", link: "https://b.com/1"))

        let report = tracker.textReport()
        XCTAssertTrue(report.contains("Feed A"))
        XCTAssertTrue(report.contains("Per-Feed Breakdown"))
    }

    // MARK: - TrackedArticle Equatable

    func testTrackedArticleEquality() {
        let a = makeArticle(feed: "https://a.com", link: "https://a.com/1", title: "A")
        let b = makeArticle(feed: "https://a.com", link: "https://a.com/1", title: "B")
        XCTAssertNotEqual(a, b)
    }

    // MARK: - Edge Cases

    func testFeedURLNormalization() {
        tracker.trackArticle(TrackedArticle(feedURL: "HTTPS://EXAMPLE.COM/FEED",
                                            articleLink: "https://e.com/1",
                                            title: "Test"))
        XCTAssertEqual(tracker.getArticles(feedURL: "https://example.com/feed").count, 1)
    }

    func testZeroWordCount() {
        tracker.trackArticle(makeArticle(link: "https://e.com/1", wordCount: 0))
        let stats = tracker.statsForFeed(url: "https://example.com/feed")!
        XCTAssertEqual(stats.averageWordCount, 0)
        XCTAssertEqual(stats.estimatedReadingTimeMinutes, 0)
    }
}
