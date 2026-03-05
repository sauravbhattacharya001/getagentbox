//
//  FeedStatisticsTracker.swift
//  FeedReaderCore
//
//  Tracks per-feed statistics: article counts, read/unread state, publishing
//  frequency analysis, and digest generation.
//

import Foundation

/// A snapshot of a single article for statistics tracking.
public struct TrackedArticle: Equatable, Sendable {
    public let feedURL: String
    public let articleLink: String
    public let title: String
    public let publishedDate: Date?
    public let wordCount: Int
    public var isRead: Bool

    public init(feedURL: String, articleLink: String, title: String,
                publishedDate: Date? = nil, wordCount: Int = 0, isRead: Bool = false) {
        self.feedURL = feedURL.lowercased()
        self.articleLink = articleLink
        self.title = title
        self.publishedDate = publishedDate
        self.wordCount = wordCount
        self.isRead = isRead
    }
}

/// Statistics for a single feed.
public struct FeedStats: Equatable, Sendable {
    public let feedURL: String
    public let feedName: String
    public let totalArticles: Int
    public let readArticles: Int
    public let unreadArticles: Int
    public let readPercentage: Double
    public let totalWordCount: Int
    public let averageWordCount: Double
    public let oldestArticleDate: Date?
    public let newestArticleDate: Date?
    public let estimatedArticlesPerDay: Double
    public let estimatedReadingTimeMinutes: Double // at 238 WPM

    /// Human-readable frequency label.
    public var frequencyLabel: String {
        if estimatedArticlesPerDay >= 10 { return "Very High" }
        if estimatedArticlesPerDay >= 3 { return "High" }
        if estimatedArticlesPerDay >= 1 { return "Daily" }
        if estimatedArticlesPerDay >= 0.14 { return "Weekly" }
        if estimatedArticlesPerDay > 0 { return "Infrequent" }
        return "Unknown"
    }
}

/// Overall statistics across all tracked feeds.
public struct OverallStats: Equatable, Sendable {
    public let totalFeeds: Int
    public let totalArticles: Int
    public let totalRead: Int
    public let totalUnread: Int
    public let readPercentage: Double
    public let totalWordCount: Int
    public let totalReadingTimeMinutes: Double
    public let busiestFeedURL: String?
    public let quietestFeedURL: String?
    public let mostReadFeedURL: String?
    public let leastReadFeedURL: String?
}

/// A daily digest entry.
public struct DigestEntry: Equatable, Sendable {
    public let date: Date
    public let articleCount: Int
    public let feedBreakdown: [(feedURL: String, count: Int)]
    public let topArticles: [TrackedArticle]

    public static func == (lhs: DigestEntry, rhs: DigestEntry) -> Bool {
        return lhs.date == rhs.date && lhs.articleCount == rhs.articleCount
    }
}

/// Tracks feed statistics and generates reports.
public class FeedStatisticsTracker {

    // MARK: - Properties

    private var articles: [TrackedArticle] = []
    private var feedNames: [String: String] = [:] // feedURL -> name
    private let wordsPerMinute: Double = 238.0

    // MARK: - Article Management

    /// Track a new article. Returns false if duplicate (same articleLink).
    @discardableResult
    public func trackArticle(_ article: TrackedArticle) -> Bool {
        if articles.contains(where: { $0.articleLink == article.articleLink }) {
            return false
        }
        articles.append(article)
        return true
    }

    /// Track multiple articles. Returns count of newly added.
    public func trackArticles(_ newArticles: [TrackedArticle]) -> Int {
        var added = 0
        for article in newArticles {
            if trackArticle(article) { added += 1 }
        }
        return added
    }

    /// Mark an article as read by its link. Returns true if found and updated.
    @discardableResult
    public func markAsRead(articleLink: String) -> Bool {
        guard let idx = articles.firstIndex(where: { $0.articleLink == articleLink }) else {
            return false
        }
        articles[idx].isRead = true
        return true
    }

    /// Mark an article as unread by its link. Returns true if found and updated.
    @discardableResult
    public func markAsUnread(articleLink: String) -> Bool {
        guard let idx = articles.firstIndex(where: { $0.articleLink == articleLink }) else {
            return false
        }
        articles[idx].isRead = false
        return true
    }

    /// Mark all articles for a feed as read. Returns count of articles marked.
    public func markAllAsRead(feedURL: String) -> Int {
        let normalized = feedURL.lowercased()
        var count = 0
        for i in articles.indices {
            if articles[i].feedURL == normalized && !articles[i].isRead {
                articles[i].isRead = true
                count += 1
            }
        }
        return count
    }

    /// Remove all tracked articles for a feed. Returns count removed.
    public func removeArticles(feedURL: String) -> Int {
        let normalized = feedURL.lowercased()
        let before = articles.count
        articles.removeAll { $0.feedURL == normalized }
        return before - articles.count
    }

    /// Remove all tracked articles.
    public func removeAllArticles() {
        articles.removeAll()
    }

    /// Get all tracked articles, optionally filtered by feed.
    public func getArticles(feedURL: String? = nil) -> [TrackedArticle] {
        if let url = feedURL {
            return articles.filter { $0.feedURL == url.lowercased() }
        }
        return articles
    }

    /// Get unread articles, optionally filtered by feed.
    public func getUnreadArticles(feedURL: String? = nil) -> [TrackedArticle] {
        return getArticles(feedURL: feedURL).filter { !$0.isRead }
    }

    /// Total article count.
    public var articleCount: Int { articles.count }

    /// Total unread count.
    public var unreadCount: Int { articles.filter { !$0.isRead }.count }

    // MARK: - Feed Name Registration

    /// Register a display name for a feed URL.
    public func registerFeedName(_ name: String, forURL url: String) {
        feedNames[url.lowercased()] = name
    }

    // MARK: - Per-Feed Statistics

    /// Get statistics for a specific feed.
    public func statsForFeed(url: String) -> FeedStats? {
        let normalized = url.lowercased()
        let feedArticles = articles.filter { $0.feedURL == normalized }
        guard !feedArticles.isEmpty else { return nil }

        let readCount = feedArticles.filter { $0.isRead }.count
        let totalWords = feedArticles.reduce(0) { $0 + $1.wordCount }
        let avgWords = Double(totalWords) / Double(feedArticles.count)

        let dates = feedArticles.compactMap { $0.publishedDate }.sorted()
        let oldest = dates.first
        let newest = dates.last

        var articlesPerDay = 0.0
        if let o = oldest, let n = newest {
            let days = max(n.timeIntervalSince(o) / 86400.0, 1.0)
            articlesPerDay = Double(feedArticles.count) / days
        }

        let readingTime = Double(totalWords) / wordsPerMinute

        return FeedStats(
            feedURL: normalized,
            feedName: feedNames[normalized] ?? normalized,
            totalArticles: feedArticles.count,
            readArticles: readCount,
            unreadArticles: feedArticles.count - readCount,
            readPercentage: feedArticles.isEmpty ? 0 : Double(readCount) / Double(feedArticles.count) * 100.0,
            totalWordCount: totalWords,
            averageWordCount: avgWords,
            oldestArticleDate: oldest,
            newestArticleDate: newest,
            estimatedArticlesPerDay: articlesPerDay,
            estimatedReadingTimeMinutes: readingTime
        )
    }

    /// Get statistics for all tracked feeds.
    public func allFeedStats() -> [FeedStats] {
        let feedURLs = Set(articles.map { $0.feedURL })
        return feedURLs.compactMap { statsForFeed(url: $0) }
            .sorted { $0.totalArticles > $1.totalArticles }
    }

    // MARK: - Overall Statistics

    /// Get aggregate statistics across all feeds.
    public func overallStats() -> OverallStats {
        let totalRead = articles.filter { $0.isRead }.count
        let totalWords = articles.reduce(0) { $0 + $1.wordCount }
        let allStats = allFeedStats()

        let busiest = allStats.max(by: { $0.totalArticles < $1.totalArticles })?.feedURL
        let quietest = allStats.min(by: { $0.totalArticles < $1.totalArticles })?.feedURL

        let feedsWithRead = allStats.filter { $0.totalArticles > 0 }
        let mostRead = feedsWithRead.max(by: { $0.readPercentage < $1.readPercentage })?.feedURL
        let leastRead = feedsWithRead.min(by: { $0.readPercentage < $1.readPercentage })?.feedURL

        return OverallStats(
            totalFeeds: Set(articles.map { $0.feedURL }).count,
            totalArticles: articles.count,
            totalRead: totalRead,
            totalUnread: articles.count - totalRead,
            readPercentage: articles.isEmpty ? 0 : Double(totalRead) / Double(articles.count) * 100.0,
            totalWordCount: totalWords,
            totalReadingTimeMinutes: Double(totalWords) / wordsPerMinute,
            busiestFeedURL: busiest,
            quietestFeedURL: quietest,
            mostReadFeedURL: mostRead,
            leastReadFeedURL: leastRead
        )
    }

    // MARK: - Digest Generation

    /// Generate a daily digest for a specific date.
    public func dailyDigest(for date: Date, calendar: Calendar = .current) -> DigestEntry {
        let dayArticles = articles.filter { article in
            guard let pub = article.publishedDate else { return false }
            return calendar.isDate(pub, inSameDayAs: date)
        }

        var feedCounts: [String: Int] = [:]
        for article in dayArticles {
            feedCounts[article.feedURL, default: 0] += 1
        }

        let breakdown = feedCounts.sorted { $0.value > $1.value }
            .map { (feedURL: $0.key, count: $0.value) }

        // Top 5 articles by word count (most substantial)
        let top = Array(dayArticles.sorted { $0.wordCount > $1.wordCount }.prefix(5))

        return DigestEntry(
            date: date,
            articleCount: dayArticles.count,
            feedBreakdown: breakdown,
            topArticles: top
        )
    }

    /// Generate digests for the last N days.
    public func recentDigests(days: Int, from referenceDate: Date = Date(),
                              calendar: Calendar = .current) -> [DigestEntry] {
        var digests: [DigestEntry] = []
        for i in 0..<max(days, 0) {
            guard let date = calendar.date(byAdding: .day, value: -i, to: referenceDate) else { continue }
            let digest = dailyDigest(for: date, calendar: calendar)
            if digest.articleCount > 0 {
                digests.append(digest)
            }
        }
        return digests
    }

    // MARK: - Feed Ranking

    /// Rank feeds by a metric. Returns feed URLs sorted by the metric descending.
    public enum RankingMetric {
        case totalArticles
        case unreadCount
        case readPercentage
        case publishingFrequency
        case averageWordCount
    }

    public func rankFeeds(by metric: RankingMetric) -> [String] {
        let stats = allFeedStats()
        let sorted: [FeedStats]
        switch metric {
        case .totalArticles:
            sorted = stats.sorted { $0.totalArticles > $1.totalArticles }
        case .unreadCount:
            sorted = stats.sorted { $0.unreadArticles > $1.unreadArticles }
        case .readPercentage:
            sorted = stats.sorted { $0.readPercentage > $1.readPercentage }
        case .publishingFrequency:
            sorted = stats.sorted { $0.estimatedArticlesPerDay > $1.estimatedArticlesPerDay }
        case .averageWordCount:
            sorted = stats.sorted { $0.averageWordCount > $1.averageWordCount }
        }
        return sorted.map { $0.feedURL }
    }

    // MARK: - Stale Feed Detection

    /// Find feeds with no articles newer than the given threshold.
    public func staleFeeds(threshold: TimeInterval = 7 * 86400,
                           referenceDate: Date = Date()) -> [String] {
        let feedURLs = Set(articles.map { $0.feedURL })
        var stale: [String] = []
        for url in feedURLs {
            let feedArticles = articles.filter { $0.feedURL == url }
            let newest = feedArticles.compactMap { $0.publishedDate }.max()
            if let n = newest {
                if referenceDate.timeIntervalSince(n) > threshold {
                    stale.append(url)
                }
            } else {
                stale.append(url) // no dates = consider stale
            }
        }
        return stale.sorted()
    }

    // MARK: - Text Report

    /// Generate a human-readable statistics report.
    public func textReport() -> String {
        let overall = overallStats()
        var lines: [String] = []

        lines.append("=== Feed Statistics Report ===")
        lines.append("")
        lines.append("Total feeds: \(overall.totalFeeds)")
        lines.append("Total articles: \(overall.totalArticles)")
        lines.append("Read: \(overall.totalRead) | Unread: \(overall.totalUnread)")
        if overall.totalArticles > 0 {
            lines.append(String(format: "Read percentage: %.1f%%", overall.readPercentage))
        }
        lines.append(String(format: "Total reading time: %.0f minutes", overall.totalReadingTimeMinutes))
        lines.append("")

        let stats = allFeedStats()
        if !stats.isEmpty {
            lines.append("--- Per-Feed Breakdown ---")
            for s in stats {
                lines.append("")
                lines.append("\(s.feedName)")
                lines.append("  Articles: \(s.totalArticles) (read: \(s.readArticles), unread: \(s.unreadArticles))")
                lines.append(String(format: "  Avg words: %.0f | Frequency: %@", s.averageWordCount, s.frequencyLabel))
                lines.append(String(format: "  Reading time: %.0f min", s.estimatedReadingTimeMinutes))
            }
        }

        return lines.joined(separator: "\n")
    }

    // MARK: - Init

    public init() {}
}
