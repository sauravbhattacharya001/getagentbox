import '../../models/event_model.dart';

/// Represents a dependency relationship between two events.
///
/// [blockerId] is the event that must be completed before [dependentId].
class EventDependency {
  /// The event that blocks (must finish first).
  final String blockerId;

  /// The event that is blocked (waits for blocker).
  final String dependentId;

  /// Optional label describing the relationship.
  final String label;

  /// When this dependency was created.
  final DateTime createdAt;

  const EventDependency({
    required this.blockerId,
    required this.dependentId,
    this.label = '',
    required this.createdAt,
  });

  /// Creates a copy with optional field overrides.
  EventDependency copyWith({
    String? blockerId,
    String? dependentId,
    String? label,
    DateTime? createdAt,
  }) {
    return EventDependency(
      blockerId: blockerId ?? this.blockerId,
      dependentId: dependentId ?? this.dependentId,
      label: label ?? this.label,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'blocker_id': blockerId,
        'dependent_id': dependentId,
        'label': label,
        'created_at': createdAt.toIso8601String(),
      };

  factory EventDependency.fromJson(Map<String, dynamic> json) {
    return EventDependency(
      blockerId: json['blocker_id'] as String,
      dependentId: json['dependent_id'] as String,
      label: (json['label'] as String?) ?? '',
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EventDependency &&
          blockerId == other.blockerId &&
          dependentId == other.dependentId;

  @override
  int get hashCode => Object.hash(blockerId, dependentId);

  @override
  String toString() =>
      'EventDependency($blockerId → $dependentId${label.isNotEmpty ? " [$label]" : ""})';
}

/// Status of an event within the dependency graph.
enum DependencyStatus {
  /// All blockers completed or no blockers — event is actionable.
  ready,

  /// One or more blockers are not yet completed.
  blocked,

  /// Event is completed.
  completed,

  /// Event is part of a circular dependency chain.
  circular,
}

/// Information about a single event's position in the dependency graph.
class EventDependencyInfo {
  /// The event ID.
  final String eventId;

  /// Events that block this event (must finish first).
  final List<String> blockedBy;

  /// Events that this event blocks (waiting on this).
  final List<String> blocks;

  /// Current status based on dependency analysis.
  final DependencyStatus status;

  /// Depth in the dependency chain (0 = no blockers).
  final int depth;

  const EventDependencyInfo({
    required this.eventId,
    required this.blockedBy,
    required this.blocks,
    required this.status,
    required this.depth,
  });

  /// Whether this event has no blockers.
  bool get isRoot => blockedBy.isEmpty;

  /// Whether this event blocks no other events.
  bool get isLeaf => blocks.isEmpty;

  /// Total number of relationships (in + out).
  int get totalRelationships => blockedBy.length + blocks.length;

  @override
  String toString() =>
      'EventDependencyInfo($eventId, status: $status, depth: $depth, '
      'blockedBy: ${blockedBy.length}, blocks: ${blocks.length})';
}

/// Result of a critical path analysis.
class CriticalPath {
  /// Ordered list of event IDs forming the longest dependency chain.
  final List<String> path;

  /// Total length of the chain.
  int get length => path.length;

  /// Whether the critical path is empty (no dependencies).
  bool get isEmpty => path.isEmpty;

  const CriticalPath({required this.path});

  @override
  String toString() => 'CriticalPath(${path.join(" → ")})';
}

/// Summary of the entire dependency graph.
class DependencyGraphSummary {
  /// Total number of events in the graph.
  final int totalEvents;

  /// Total number of dependency relationships.
  final int totalDependencies;

  /// Events with no blockers (entry points).
  final List<String> rootEvents;

  /// Events that block nothing (end points).
  final List<String> leafEvents;

  /// Events currently blocked by incomplete dependencies.
  final List<String> blockedEvents;

  /// Events that are ready to work on.
  final List<String> readyEvents;

  /// Longest dependency chain.
  final CriticalPath criticalPath;

  /// Maximum depth in the dependency graph.
  final int maxDepth;

  /// Whether any circular dependencies were detected.
  final bool hasCircularDependencies;

  /// Event IDs involved in circular dependencies.
  final List<String> circularEventIds;

  const DependencyGraphSummary({
    required this.totalEvents,
    required this.totalDependencies,
    required this.rootEvents,
    required this.leafEvents,
    required this.blockedEvents,
    required this.readyEvents,
    required this.criticalPath,
    required this.maxDepth,
    required this.hasCircularDependencies,
    required this.circularEventIds,
  });

  @override
  String toString() =>
      'DependencyGraphSummary(events: $totalEvents, deps: $totalDependencies, '
      'blocked: ${blockedEvents.length}, ready: ${readyEvents.length}, '
      'circular: $hasCircularDependencies, maxDepth: $maxDepth)';
}

/// Tracks dependency relationships between events, detects circular
/// dependencies, computes critical paths, and identifies blocked/ready events.
///
/// Usage:
/// ```dart
/// final tracker = EventDependencyTracker();
/// tracker.addDependency('task-a', 'task-b'); // B depends on A
/// tracker.addDependency('task-b', 'task-c'); // C depends on B
/// tracker.markCompleted('task-a');
///
/// final info = tracker.getInfo('task-b'); // status: ready
/// final summary = tracker.analyze(events);
/// ```
class EventDependencyTracker {
  final List<EventDependency> _dependencies = [];
  final Set<String> _completedEvents = {};

  /// Maximum number of dependencies allowed (prevents abuse).
  static const int maxDependencies = 500;

  /// All registered dependencies.
  List<EventDependency> get dependencies => List.unmodifiable(_dependencies);

  /// All completed event IDs.
  Set<String> get completedEvents => Set.unmodifiable(_completedEvents);

  /// Adds a dependency: [blockerId] must complete before [dependentId].
  ///
  /// Returns `true` if added, `false` if it would create a duplicate,
  /// self-reference, or exceed the limit.
  bool addDependency(
    String blockerId,
    String dependentId, {
    String label = '',
    DateTime? createdAt,
  }) {
    if (blockerId.isEmpty || dependentId.isEmpty) return false;
    if (blockerId == dependentId) return false;
    if (_dependencies.length >= maxDependencies) return false;

    final dep = EventDependency(
      blockerId: blockerId,
      dependentId: dependentId,
      label: label,
      createdAt: createdAt ?? DateTime.now(),
    );

    if (_dependencies.contains(dep)) return false;

    _dependencies.add(dep);
    return true;
  }

  /// Removes a specific dependency relationship.
  bool removeDependency(String blockerId, String dependentId) {
    final before = _dependencies.length;
    _dependencies.removeWhere(
      (d) => d.blockerId == blockerId && d.dependentId == dependentId,
    );
    return _dependencies.length < before;
  }

  /// Removes all dependencies involving the given event ID.
  int removeAllForEvent(String eventId) {
    final before = _dependencies.length;
    _dependencies.removeWhere(
      (d) => d.blockerId == eventId || d.dependentId == eventId,
    );
    _completedEvents.remove(eventId);
    return before - _dependencies.length;
  }

  /// Marks an event as completed.
  void markCompleted(String eventId) {
    _completedEvents.add(eventId);
  }

  /// Marks an event as not completed.
  void markIncomplete(String eventId) {
    _completedEvents.remove(eventId);
  }

  /// Whether the given event is marked as completed.
  bool isCompleted(String eventId) => _completedEvents.contains(eventId);

  /// Gets the IDs of events that block [eventId].
  List<String> getBlockers(String eventId) {
    return _dependencies
        .where((d) => d.dependentId == eventId)
        .map((d) => d.blockerId)
        .toList();
  }

  /// Gets the IDs of events that [eventId] blocks.
  List<String> getDependents(String eventId) {
    return _dependencies
        .where((d) => d.blockerId == eventId)
        .map((d) => d.dependentId)
        .toList();
  }

  /// Gets dependencies where [eventId] is the dependent.
  List<EventDependency> getDependenciesFor(String eventId) {
    return _dependencies.where((d) => d.dependentId == eventId).toList();
  }

  /// Gets dependencies where [eventId] is the blocker.
  List<EventDependency> getDependenciesFrom(String eventId) {
    return _dependencies.where((d) => d.blockerId == eventId).toList();
  }

  /// Detects if adding a dependency would create a circular reference.
  bool wouldCreateCycle(String blockerId, String dependentId) {
    if (blockerId == dependentId) return true;

    // BFS forward from dependentId
    final visited = <String>{};
    final queue = <String>[dependentId];

    while (queue.isNotEmpty) {
      final current = queue.removeAt(0);
      if (current == blockerId) return true;
      if (visited.contains(current)) continue;
      visited.add(current);

      for (final dep in _dependencies) {
        if (dep.blockerId == current && !visited.contains(dep.dependentId)) {
          queue.add(dep.dependentId);
        }
      }
    }

    // BFS backward from blockerId
    final visited2 = <String>{};
    final queue2 = <String>[blockerId];

    while (queue2.isNotEmpty) {
      final current = queue2.removeAt(0);
      if (current == dependentId) return true;
      if (visited2.contains(current)) continue;
      visited2.add(current);

      for (final dep in _dependencies) {
        if (dep.dependentId == current && !visited2.contains(dep.blockerId)) {
          queue2.add(dep.blockerId);
        }
      }
    }

    return false;
  }

  /// Detects all event IDs involved in circular dependencies.
  List<String> findCircularDependencies() {
    final circularIds = <String>{};
    final allIds = _allEventIds();

    final color = <String, int>{};
    for (final id in allIds) {
      color[id] = 0;
    }

    void dfs(String node, List<String> path) {
      color[node] = 1;
      path.add(node);

      for (final dep in _dependencies) {
        if (dep.blockerId != node) continue;
        final next = dep.dependentId;

        if (color[next] == 1) {
          final cycleStart = path.indexOf(next);
          if (cycleStart >= 0) {
            for (var i = cycleStart; i < path.length; i++) {
              circularIds.add(path[i]);
            }
          }
        } else if (color[next] == 0) {
          dfs(next, path);
        }
      }

      path.removeLast();
      color[node] = 2;
    }

    for (final id in allIds) {
      if (color[id] == 0) {
        dfs(id, []);
      }
    }

    return circularIds.toList()..sort();
  }

  /// Computes the depth of each event in the dependency graph.
  Map<String, int> computeDepths() {
    final allIds = _allEventIds();
    final depths = <String, int>{};
    final circular = findCircularDependencies().toSet();

    for (final id in allIds) {
      if (circular.contains(id)) continue;
      if (getBlockers(id).isEmpty) {
        depths[id] = 0;
      }
    }

    var changed = true;
    var iterations = 0;
    final maxIterations = allIds.length + 1;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (final id in allIds) {
        if (circular.contains(id) || depths.containsKey(id)) continue;

        final blockers = getBlockers(id);
        if (blockers.every((b) => depths.containsKey(b))) {
          final maxBlockerDepth =
              blockers.map((b) => depths[b]!).reduce((a, b) => a > b ? a : b);
          depths[id] = maxBlockerDepth + 1;
          changed = true;
        }
      }
    }

    return depths;
  }

  /// Gets dependency info for a specific event.
  EventDependencyInfo getInfo(String eventId) {
    final blockers = getBlockers(eventId);
    final dependents = getDependents(eventId);
    final circular = findCircularDependencies();
    final depths = computeDepths();

    DependencyStatus status;
    if (circular.contains(eventId)) {
      status = DependencyStatus.circular;
    } else if (_completedEvents.contains(eventId)) {
      status = DependencyStatus.completed;
    } else if (blockers.isEmpty ||
        blockers.every((b) => _completedEvents.contains(b))) {
      status = DependencyStatus.ready;
    } else {
      status = DependencyStatus.blocked;
    }

    return EventDependencyInfo(
      eventId: eventId,
      blockedBy: blockers,
      blocks: dependents,
      status: status,
      depth: depths[eventId] ?? 0,
    );
  }

  /// Finds the critical path (longest dependency chain).
  CriticalPath findCriticalPath() {
    final circular = findCircularDependencies().toSet();
    final depths = computeDepths();
    final allIds = _allEventIds().where((id) => !circular.contains(id));

    if (allIds.isEmpty) return const CriticalPath(path: []);

    String? deepest;
    int maxDepth = -1;
    for (final id in allIds) {
      final d = depths[id] ?? 0;
      if (d > maxDepth) {
        maxDepth = d;
        deepest = id;
      }
    }

    if (deepest == null) return const CriticalPath(path: []);

    final path = <String>[deepest];
    var current = deepest;

    while (true) {
      final blockers = getBlockers(current);
      if (blockers.isEmpty) break;

      String? bestBlocker;
      int bestDepth = -1;
      for (final b in blockers) {
        final d = depths[b] ?? 0;
        if (d > bestDepth) {
          bestDepth = d;
          bestBlocker = b;
        }
      }

      if (bestBlocker == null) break;
      path.insert(0, bestBlocker);
      current = bestBlocker;
    }

    return CriticalPath(path: path);
  }

  /// Returns events that are ready to work on.
  List<String> findReadyEvents() {
    final allIds = _allEventIds();
    final circular = findCircularDependencies().toSet();
    final ready = <String>[];

    for (final id in allIds) {
      if (_completedEvents.contains(id)) continue;
      if (circular.contains(id)) continue;

      final blockers = getBlockers(id);
      if (blockers.isEmpty ||
          blockers.every((b) => _completedEvents.contains(b))) {
        ready.add(id);
      }
    }

    return ready..sort();
  }

  /// Returns events that are currently blocked.
  List<String> findBlockedEvents() {
    final allIds = _allEventIds();
    final circular = findCircularDependencies().toSet();
    final blocked = <String>[];

    for (final id in allIds) {
      if (_completedEvents.contains(id)) continue;
      if (circular.contains(id)) continue;

      final blockers = getBlockers(id);
      if (blockers.isNotEmpty &&
          !blockers.every((b) => _completedEvents.contains(b))) {
        blocked.add(id);
      }
    }

    return blocked..sort();
  }

  /// Performs a full analysis of the dependency graph.
  DependencyGraphSummary analyze(List<EventModel> events) {
    final circular = findCircularDependencies();
    final depths = computeDepths();
    final allIds = _allEventIds();

    final rootEvents = <String>[];
    final leafEvents = <String>[];

    for (final id in allIds) {
      if (getBlockers(id).isEmpty) rootEvents.add(id);
      if (getDependents(id).isEmpty) leafEvents.add(id);
    }

    return DependencyGraphSummary(
      totalEvents: allIds.length,
      totalDependencies: _dependencies.length,
      rootEvents: rootEvents..sort(),
      leafEvents: leafEvents..sort(),
      blockedEvents: findBlockedEvents(),
      readyEvents: findReadyEvents(),
      criticalPath: findCriticalPath(),
      maxDepth: depths.values.isEmpty
          ? 0
          : depths.values.reduce((a, b) => a > b ? a : b),
      hasCircularDependencies: circular.isNotEmpty,
      circularEventIds: circular,
    );
  }

  /// Returns a topological ordering of events.
  ///
  /// Returns null if circular dependencies prevent a valid ordering.
  List<String>? topologicalSort() {
    final circular = findCircularDependencies();
    if (circular.isNotEmpty) return null;

    final allIds = _allEventIds();
    final inDegree = <String, int>{};
    for (final id in allIds) {
      inDegree[id] = 0;
    }
    for (final dep in _dependencies) {
      inDegree[dep.dependentId] = (inDegree[dep.dependentId] ?? 0) + 1;
    }

    final queue = <String>[];
    for (final id in allIds) {
      if (inDegree[id] == 0) queue.add(id);
    }
    queue.sort();

    final result = <String>[];
    while (queue.isNotEmpty) {
      final current = queue.removeAt(0);
      result.add(current);

      for (final dep in _dependencies) {
        if (dep.blockerId != current) continue;
        inDegree[dep.dependentId] = (inDegree[dep.dependentId] ?? 1) - 1;
        if (inDegree[dep.dependentId] == 0) {
          var inserted = false;
          for (var i = 0; i < queue.length; i++) {
            if (dep.dependentId.compareTo(queue[i]) < 0) {
              queue.insert(i, dep.dependentId);
              inserted = true;
              break;
            }
          }
          if (!inserted) queue.add(dep.dependentId);
        }
      }
    }

    return result.length == allIds.length ? result : null;
  }

  /// Gets a formatted text summary of the dependency graph.
  String formatSummary(List<EventModel> events) {
    final summary = analyze(events);
    final eventMap = {for (final e in events) e.id: e.title};
    String name(String id) => eventMap[id] ?? id;

    final buf = StringBuffer();
    buf.writeln('=== Event Dependency Summary ===');
    buf.writeln('Events: ${summary.totalEvents}');
    buf.writeln('Dependencies: ${summary.totalDependencies}');
    buf.writeln('Max Depth: ${summary.maxDepth}');
    buf.writeln();

    if (summary.readyEvents.isNotEmpty) {
      buf.writeln('✅ Ready (${summary.readyEvents.length}):');
      for (final id in summary.readyEvents) {
        buf.writeln('  • ${name(id)}');
      }
      buf.writeln();
    }

    if (summary.blockedEvents.isNotEmpty) {
      buf.writeln('🚫 Blocked (${summary.blockedEvents.length}):');
      for (final id in summary.blockedEvents) {
        final blockers = getBlockers(id).map(name).join(', ');
        buf.writeln('  • ${name(id)} ← blocked by: $blockers');
      }
      buf.writeln();
    }

    if (summary.hasCircularDependencies) {
      buf.writeln('⚠️ Circular Dependencies:');
      for (final id in summary.circularEventIds) {
        buf.writeln('  • ${name(id)}');
      }
      buf.writeln();
    }

    if (!summary.criticalPath.isEmpty) {
      buf.writeln(
          '📐 Critical Path (${summary.criticalPath.length} events):');
      buf.writeln(
          '  ${summary.criticalPath.path.map(name).join(' → ')}');
    }

    return buf.toString().trimRight();
  }

  /// Serializes all dependencies and state to JSON.
  Map<String, dynamic> toJson() => {
        'dependencies': _dependencies.map((d) => d.toJson()).toList(),
        'completed': _completedEvents.toList()..sort(),
      };

  /// Restores tracker state from JSON.
  factory EventDependencyTracker.fromJson(Map<String, dynamic> json) {
    final tracker = EventDependencyTracker();
    final deps = json['dependencies'] as List<dynamic>? ?? [];
    for (final d in deps) {
      final dep = EventDependency.fromJson(d as Map<String, dynamic>);
      tracker._dependencies.add(dep);
    }
    final completed = json['completed'] as List<dynamic>? ?? [];
    for (final id in completed) {
      tracker._completedEvents.add(id as String);
    }
    return tracker;
  }

  /// Clears all dependencies and completion state.
  void clear() {
    _dependencies.clear();
    _completedEvents.clear();
  }

  Set<String> _allEventIds() {
    final ids = <String>{};
    for (final dep in _dependencies) {
      ids.add(dep.blockerId);
      ids.add(dep.dependentId);
    }
    return ids;
  }
}
