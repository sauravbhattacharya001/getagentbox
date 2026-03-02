import 'package:flutter_test/flutter_test.dart';
import 'package:everything/core/services/dependency_tracker.dart';
import 'package:everything/models/event_model.dart';

EventModel _event(String id, String title) => EventModel(
      id: id,
      title: title,
      date: DateTime(2026, 3, 1),
    );

void main() {
  group('EventDependency', () {
    test('toJson/fromJson round-trip', () {
      final dep = EventDependency(
        blockerId: 'a',
        dependentId: 'b',
        label: 'prerequisite',
        createdAt: DateTime(2026, 1, 1),
      );
      final json = dep.toJson();
      final restored = EventDependency.fromJson(json);
      expect(restored.blockerId, 'a');
      expect(restored.dependentId, 'b');
      expect(restored.label, 'prerequisite');
      expect(restored.createdAt, DateTime(2026, 1, 1));
    });

    test('equality is based on blockerId and dependentId', () {
      final d1 = EventDependency(
          blockerId: 'a', dependentId: 'b', createdAt: DateTime(2026));
      final d2 = EventDependency(
          blockerId: 'a',
          dependentId: 'b',
          label: 'different',
          createdAt: DateTime(2025));
      final d3 = EventDependency(
          blockerId: 'a', dependentId: 'c', createdAt: DateTime(2026));
      expect(d1, equals(d2));
      expect(d1, isNot(equals(d3)));
    });

    test('copyWith creates modified copy', () {
      final dep = EventDependency(
          blockerId: 'a', dependentId: 'b', createdAt: DateTime(2026));
      final copy = dep.copyWith(label: 'updated');
      expect(copy.label, 'updated');
      expect(copy.blockerId, 'a');
    });

    test('toString includes label when present', () {
      final dep = EventDependency(
          blockerId: 'a',
          dependentId: 'b',
          label: 'test',
          createdAt: DateTime(2026));
      expect(dep.toString(), contains('[test]'));
    });

    test('toString omits label when empty', () {
      final dep = EventDependency(
          blockerId: 'a', dependentId: 'b', createdAt: DateTime(2026));
      expect(dep.toString(), isNot(contains('[')));
    });

    test('fromJson handles missing label', () {
      final dep = EventDependency.fromJson({
        'blocker_id': 'x',
        'dependent_id': 'y',
        'created_at': '2026-01-01T00:00:00.000',
      });
      expect(dep.label, '');
    });
  });

  group('EventDependencyInfo', () {
    test('isRoot when no blockers', () {
      const info = EventDependencyInfo(
          eventId: 'a',
          blockedBy: [],
          blocks: ['b'],
          status: DependencyStatus.ready,
          depth: 0);
      expect(info.isRoot, isTrue);
      expect(info.isLeaf, isFalse);
    });

    test('isLeaf when no dependents', () {
      const info = EventDependencyInfo(
          eventId: 'b',
          blockedBy: ['a'],
          blocks: [],
          status: DependencyStatus.blocked,
          depth: 1);
      expect(info.isLeaf, isTrue);
      expect(info.isRoot, isFalse);
    });

    test('totalRelationships counts both directions', () {
      const info = EventDependencyInfo(
          eventId: 'b',
          blockedBy: ['a'],
          blocks: ['c', 'd'],
          status: DependencyStatus.ready,
          depth: 1);
      expect(info.totalRelationships, 3);
    });
  });

  group('CriticalPath', () {
    test('isEmpty when no path', () {
      const cp = CriticalPath(path: []);
      expect(cp.isEmpty, isTrue);
      expect(cp.length, 0);
    });

    test('toString shows arrow chain', () {
      const cp = CriticalPath(path: ['a', 'b', 'c']);
      expect(cp.toString(), contains('a → b → c'));
    });
  });

  group('EventDependencyTracker - addDependency', () {
    late EventDependencyTracker tracker;

    setUp(() {
      tracker = EventDependencyTracker();
    });

    test('adds a valid dependency', () {
      expect(tracker.addDependency('a', 'b'), isTrue);
      expect(tracker.dependencies.length, 1);
    });

    test('rejects self-reference', () {
      expect(tracker.addDependency('a', 'a'), isFalse);
      expect(tracker.dependencies, isEmpty);
    });

    test('rejects empty IDs', () {
      expect(tracker.addDependency('', 'b'), isFalse);
      expect(tracker.addDependency('a', ''), isFalse);
    });

    test('rejects duplicate dependency', () {
      tracker.addDependency('a', 'b');
      expect(tracker.addDependency('a', 'b'), isFalse);
      expect(tracker.dependencies.length, 1);
    });

    test('allows reverse direction', () {
      tracker.addDependency('a', 'b');
      expect(tracker.addDependency('b', 'a'), isTrue);
      expect(tracker.dependencies.length, 2);
    });

    test('accepts optional label and createdAt', () {
      tracker.addDependency('a', 'b',
          label: 'test', createdAt: DateTime(2026));
      expect(tracker.dependencies.first.label, 'test');
      expect(tracker.dependencies.first.createdAt, DateTime(2026));
    });
  });

  group('EventDependencyTracker - removeDependency', () {
    late EventDependencyTracker tracker;

    setUp(() {
      tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
    });

    test('removes existing dependency', () {
      expect(tracker.removeDependency('a', 'b'), isTrue);
      expect(tracker.dependencies.length, 1);
    });

    test('returns false for non-existent dependency', () {
      expect(tracker.removeDependency('x', 'y'), isFalse);
    });
  });

  group('EventDependencyTracker - removeAllForEvent', () {
    late EventDependencyTracker tracker;

    setUp(() {
      tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
      tracker.addDependency('a', 'c');
      tracker.markCompleted('b');
    });

    test('removes all dependencies involving event', () {
      final removed = tracker.removeAllForEvent('b');
      expect(removed, 2);
      expect(tracker.dependencies.length, 1);
      expect(tracker.isCompleted('b'), isFalse);
    });

    test('returns 0 for unknown event', () {
      expect(tracker.removeAllForEvent('z'), 0);
    });
  });

  group('EventDependencyTracker - completion tracking', () {
    late EventDependencyTracker tracker;

    setUp(() {
      tracker = EventDependencyTracker();
    });

    test('markCompleted and isCompleted', () {
      tracker.markCompleted('a');
      expect(tracker.isCompleted('a'), isTrue);
      expect(tracker.isCompleted('b'), isFalse);
    });

    test('markIncomplete removes completion', () {
      tracker.markCompleted('a');
      tracker.markIncomplete('a');
      expect(tracker.isCompleted('a'), isFalse);
    });

    test('completedEvents returns unmodifiable set', () {
      tracker.markCompleted('a');
      expect(tracker.completedEvents, contains('a'));
    });
  });

  group('EventDependencyTracker - getBlockers/getDependents', () {
    late EventDependencyTracker tracker;

    setUp(() {
      tracker = EventDependencyTracker();
      tracker.addDependency('a', 'c');
      tracker.addDependency('b', 'c');
      tracker.addDependency('c', 'd');
    });

    test('getBlockers returns all blockers', () {
      final blockers = tracker.getBlockers('c');
      expect(blockers, containsAll(['a', 'b']));
      expect(blockers.length, 2);
    });

    test('getDependents returns all dependents', () {
      expect(tracker.getDependents('c'), ['d']);
    });

    test('getBlockers returns empty for root', () {
      expect(tracker.getBlockers('a'), isEmpty);
    });

    test('getDependents returns empty for leaf', () {
      expect(tracker.getDependents('d'), isEmpty);
    });
  });

  group('EventDependencyTracker - getDependenciesFor/From', () {
    late EventDependencyTracker tracker;

    setUp(() {
      tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b', label: 'first');
      tracker.addDependency('a', 'c', label: 'second');
    });

    test('getDependenciesFrom returns outgoing deps', () {
      final deps = tracker.getDependenciesFrom('a');
      expect(deps.length, 2);
      expect(deps.map((d) => d.dependentId), containsAll(['b', 'c']));
    });

    test('getDependenciesFor returns incoming deps', () {
      final deps = tracker.getDependenciesFor('b');
      expect(deps.length, 1);
      expect(deps.first.blockerId, 'a');
    });
  });

  group('EventDependencyTracker - wouldCreateCycle', () {
    late EventDependencyTracker tracker;

    setUp(() {
      tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
    });

    test('detects direct cycle', () {
      expect(tracker.wouldCreateCycle('b', 'a'), isTrue);
    });

    test('detects indirect cycle', () {
      expect(tracker.wouldCreateCycle('c', 'a'), isTrue);
    });

    test('self-reference is a cycle', () {
      expect(tracker.wouldCreateCycle('a', 'a'), isTrue);
    });

    test('no cycle for valid new dependency', () {
      expect(tracker.wouldCreateCycle('a', 'd'), isFalse);
    });

    test('no cycle for independent chains', () {
      tracker.addDependency('x', 'y');
      expect(tracker.wouldCreateCycle('y', 'a'), isFalse);
    });
  });

  group('EventDependencyTracker - findCircularDependencies', () {
    test('returns empty when no cycles', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
      expect(tracker.findCircularDependencies(), isEmpty);
    });

    test('detects simple 2-node cycle', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'a');
      final circular = tracker.findCircularDependencies();
      expect(circular, containsAll(['a', 'b']));
    });

    test('detects 3-node cycle', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
      tracker.addDependency('c', 'a');
      final circular = tracker.findCircularDependencies();
      expect(circular, containsAll(['a', 'b', 'c']));
    });

    test('isolates cycle from non-cyclic nodes', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('x', 'a');
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'a');
      tracker.addDependency('b', 'y');
      final circular = tracker.findCircularDependencies();
      expect(circular, containsAll(['a', 'b']));
      expect(circular, isNot(contains('x')));
      expect(circular, isNot(contains('y')));
    });
  });

  group('EventDependencyTracker - computeDepths', () {
    test('roots have depth 0', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
      final depths = tracker.computeDepths();
      expect(depths['a'], 0);
      expect(depths['b'], 1);
      expect(depths['c'], 2);
    });

    test('multiple blockers takes max depth', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'c');
      tracker.addDependency('b', 'c');
      tracker.addDependency('a', 'b');
      final depths = tracker.computeDepths();
      expect(depths['a'], 0);
      expect(depths['b'], 1);
      expect(depths['c'], 2);
    });

    test('skips circular nodes', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'a');
      tracker.addDependency('x', 'y');
      final depths = tracker.computeDepths();
      expect(depths.containsKey('a'), isFalse);
      expect(depths['x'], 0);
      expect(depths['y'], 1);
    });
  });

  group('EventDependencyTracker - getInfo', () {
    test('ready when no blockers', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      final info = tracker.getInfo('a');
      expect(info.status, DependencyStatus.ready);
      expect(info.depth, 0);
    });

    test('blocked when blocker incomplete', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      final info = tracker.getInfo('b');
      expect(info.status, DependencyStatus.blocked);
    });

    test('ready when all blockers completed', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.markCompleted('a');
      final info = tracker.getInfo('b');
      expect(info.status, DependencyStatus.ready);
    });

    test('completed overrides blocked', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.markCompleted('b');
      final info = tracker.getInfo('b');
      expect(info.status, DependencyStatus.completed);
    });

    test('circular status for cyclic nodes', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'a');
      expect(tracker.getInfo('a').status, DependencyStatus.circular);
    });
  });

  group('EventDependencyTracker - findCriticalPath', () {
    test('empty when no dependencies', () {
      final tracker = EventDependencyTracker();
      expect(tracker.findCriticalPath().isEmpty, isTrue);
    });

    test('finds longest chain', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
      tracker.addDependency('x', 'c');
      final cp = tracker.findCriticalPath();
      expect(cp.path, ['a', 'b', 'c']);
      expect(cp.length, 3);
    });

    test('skips circular nodes', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'a');
      tracker.addDependency('x', 'y');
      final cp = tracker.findCriticalPath();
      expect(cp.path, ['x', 'y']);
    });
  });

  group('EventDependencyTracker - findReadyEvents/findBlockedEvents', () {
    late EventDependencyTracker tracker;

    setUp(() {
      tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
    });

    test('findReadyEvents returns unblocked events', () {
      expect(tracker.findReadyEvents(), ['a']);
    });

    test('completing blocker makes dependent ready', () {
      tracker.markCompleted('a');
      final ready = tracker.findReadyEvents();
      expect(ready, contains('b'));
      expect(ready, isNot(contains('a')));
    });

    test('findBlockedEvents returns blocked events', () {
      final blocked = tracker.findBlockedEvents();
      expect(blocked, containsAll(['b', 'c']));
    });

    test('completing all blockers removes from blocked', () {
      tracker.markCompleted('a');
      tracker.markCompleted('b');
      expect(tracker.findBlockedEvents(), isEmpty);
    });
  });

  group('EventDependencyTracker - topologicalSort', () {
    test('returns valid ordering', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
      tracker.addDependency('a', 'c');
      final sorted = tracker.topologicalSort();
      expect(sorted, isNotNull);
      expect(sorted!.indexOf('a'), lessThan(sorted.indexOf('b')));
      expect(sorted.indexOf('b'), lessThan(sorted.indexOf('c')));
    });

    test('returns null for cycles', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'a');
      expect(tracker.topologicalSort(), isNull);
    });

    test('handles independent events', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('x', 'y');
      final sorted = tracker.topologicalSort();
      expect(sorted, isNotNull);
      expect(sorted!.length, 4);
    });
  });

  group('EventDependencyTracker - analyze', () {
    test('produces complete summary', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
      tracker.markCompleted('a');

      final events = [
        _event('a', 'Task A'),
        _event('b', 'Task B'),
        _event('c', 'Task C'),
      ];

      final summary = tracker.analyze(events);
      expect(summary.totalEvents, 3);
      expect(summary.totalDependencies, 2);
      expect(summary.rootEvents, ['a']);
      expect(summary.leafEvents, ['c']);
      expect(summary.readyEvents, contains('b'));
      expect(summary.blockedEvents, contains('c'));
      expect(summary.hasCircularDependencies, isFalse);
      expect(summary.maxDepth, 2);
    });

    test('detects circular dependencies in summary', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'a');
      final summary = tracker.analyze([]);
      expect(summary.hasCircularDependencies, isTrue);
      expect(summary.circularEventIds, containsAll(['a', 'b']));
    });
  });

  group('EventDependencyTracker - formatSummary', () {
    test('includes ready and blocked sections', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      final events = [_event('a', 'Setup'), _event('b', 'Build')];
      final text = tracker.formatSummary(events);
      expect(text, contains('Ready'));
      expect(text, contains('Setup'));
      expect(text, contains('Blocked'));
      expect(text, contains('Build'));
    });

    test('uses event titles when available', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      final events = [_event('a', 'My Task')];
      final text = tracker.formatSummary(events);
      expect(text, contains('My Task'));
    });

    test('includes circular warning', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'a');
      final text = tracker.formatSummary([]);
      expect(text, contains('Circular'));
    });

    test('includes critical path', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('b', 'c');
      final events = [
        _event('a', 'First'),
        _event('b', 'Second'),
        _event('c', 'Third'),
      ];
      final text = tracker.formatSummary(events);
      expect(text, contains('Critical Path'));
    });
  });

  group('EventDependencyTracker - serialization', () {
    test('toJson/fromJson round-trip', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b', label: 'test');
      tracker.addDependency('b', 'c');
      tracker.markCompleted('a');

      final json = tracker.toJson();
      final restored = EventDependencyTracker.fromJson(json);

      expect(restored.dependencies.length, 2);
      expect(restored.isCompleted('a'), isTrue);
      expect(restored.getBlockers('b'), ['a']);
    });

    test('fromJson handles empty data', () {
      final tracker = EventDependencyTracker.fromJson({});
      expect(tracker.dependencies, isEmpty);
      expect(tracker.completedEvents, isEmpty);
    });
  });

  group('EventDependencyTracker - clear', () {
    test('clears all state', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.markCompleted('a');
      tracker.clear();
      expect(tracker.dependencies, isEmpty);
      expect(tracker.completedEvents, isEmpty);
    });
  });

  group('EventDependencyTracker - max dependencies limit', () {
    test('rejects when at capacity', () {
      final tracker = EventDependencyTracker();
      for (var i = 0; i < EventDependencyTracker.maxDependencies; i++) {
        tracker.addDependency('blocker_$i', 'dep_$i');
      }
      expect(
          tracker.addDependency('overflow_blocker', 'overflow_dep'), isFalse);
    });
  });

  group('DependencyGraphSummary', () {
    test('toString is informative', () {
      const summary = DependencyGraphSummary(
        totalEvents: 5,
        totalDependencies: 4,
        rootEvents: ['a'],
        leafEvents: ['e'],
        blockedEvents: ['c', 'd'],
        readyEvents: ['b'],
        criticalPath: CriticalPath(path: ['a', 'b', 'c']),
        maxDepth: 3,
        hasCircularDependencies: false,
        circularEventIds: [],
      );
      final str = summary.toString();
      expect(str, contains('events: 5'));
      expect(str, contains('deps: 4'));
    });
  });

  group('EventDependencyTracker - complex scenarios', () {
    test('diamond dependency pattern', () {
      final tracker = EventDependencyTracker();
      tracker.addDependency('a', 'b');
      tracker.addDependency('a', 'c');
      tracker.addDependency('b', 'd');
      tracker.addDependency('c', 'd');

      final depths = tracker.computeDepths();
      expect(depths['a'], 0);
      expect(depths['d'], 2);

      tracker.markCompleted('a');
      expect(tracker.findReadyEvents(), containsAll(['b', 'c']));
      expect(tracker.findBlockedEvents(), ['d']);

      tracker.markCompleted('b');
      expect(tracker.findBlockedEvents(), ['d']);

      tracker.markCompleted('c');
      expect(tracker.findReadyEvents(), ['d']);
      expect(tracker.findBlockedEvents(), isEmpty);
    });

    test('wide fan-out pattern', () {
      final tracker = EventDependencyTracker();
      for (var i = 0; i < 5; i++) {
        tracker.addDependency('root', 'leaf_$i');
      }
      expect(tracker.getDependents('root').length, 5);
      expect(tracker.findReadyEvents(), ['root']);

      tracker.markCompleted('root');
      expect(tracker.findReadyEvents().length, 5);
    });

    test('wide fan-in pattern', () {
      final tracker = EventDependencyTracker();
      for (var i = 0; i < 5; i++) {
        tracker.addDependency('blocker_$i', 'target');
      }
      expect(tracker.getBlockers('target').length, 5);
      expect(tracker.getInfo('target').status, DependencyStatus.blocked);

      for (var i = 0; i < 4; i++) {
        tracker.markCompleted('blocker_$i');
      }
      expect(tracker.getInfo('target').status, DependencyStatus.blocked);

      tracker.markCompleted('blocker_4');
      expect(tracker.getInfo('target').status, DependencyStatus.ready);
    });
  });
}
