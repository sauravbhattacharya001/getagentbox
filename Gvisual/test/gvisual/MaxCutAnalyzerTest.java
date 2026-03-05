package gvisual;

import edu.uci.ics.jung.graph.Graph;
import edu.uci.ics.jung.graph.UndirectedSparseGraph;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

import java.util.*;

/**
 * Tests for MaxCutAnalyzer -- greedy, local search, random local search,
 * exact brute-force, balanced cuts, bounds, vertex contributions, and reports.
 */
public class MaxCutAnalyzerTest {

    private Graph<String, edge> graph;

    @Before
    public void setUp() {
        graph = new UndirectedSparseGraph<String, edge>();
    }

    private void addEdge(String v1, String v2) {
        edge e = new edge("f", v1, v2);
        graph.addEdge(e, v1, v2);
    }

    private void addWeightedEdge(String v1, String v2, float weight) {
        edge e = new edge("f", v1, v2);
        e.setWeight(weight);
        graph.addEdge(e, v1, v2);
    }

    // ── Constructor ─────────────────────────────────────────────────

    @Test(expected = IllegalArgumentException.class)
    public void testNullGraphThrows() {
        new MaxCutAnalyzer(null);
    }

    @Test
    public void testConstructorAcceptsValidGraph() {
        assertNotNull(new MaxCutAnalyzer(graph));
    }

    // ── Empty graph ─────────────────────────────────────────────────

    @Test
    public void testEmptyGraphGreedy() {
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeGreedy();
        assertEquals(0, r.getCutEdgeCount());
        assertEquals(0.0, r.getCutValue(), 0.001);
        assertTrue(r.getSetS().isEmpty());
        assertTrue(r.getSetT().isEmpty());
    }

    @Test
    public void testEmptyGraphLocalSearch() {
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeLocalSearch();
        assertEquals(0, r.getCutEdgeCount());
    }

    @Test
    public void testEmptyGraphExact() {
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(0, r.getCutEdgeCount());
    }

    // ── Single vertex ───────────────────────────────────────────────

    @Test
    public void testSingleVertex() {
        graph.addVertex("A");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeGreedy();
        assertEquals(0, r.getCutEdgeCount());
        assertEquals(1, r.getSetS().size() + r.getSetT().size());
    }

    // ── Single edge ─────────────────────────────────────────────────

    @Test
    public void testSingleEdgeGreedy() {
        addEdge("A", "B");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeGreedy();
        assertEquals(1, r.getCutEdgeCount());
        assertEquals(1.0, r.getCutValue(), 0.001);
    }

    @Test
    public void testSingleEdgeExact() {
        addEdge("A", "B");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(1, r.getCutEdgeCount());
    }

    // ── Triangle (K3) ───────────────────────────────────────────────

    @Test
    public void testTriangleMaxCutIs2() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("A", "C");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(2, r.getCutEdgeCount());
    }

    @Test
    public void testTriangleGreedyAtLeast2() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("A", "C");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeGreedy();
        assertTrue(r.getCutEdgeCount() >= 2);
    }

    // ── Complete bipartite K3,3 ─────────────────────────────────────

    @Test
    public void testBipartiteK33PerfectCut() {
        for (int i = 1; i <= 3; i++) {
            for (int j = 4; j <= 6; j++) {
                addEdge("" + i, "" + j);
            }
        }
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(9, r.getCutEdgeCount());
    }

    @Test
    public void testBipartiteLocalSearchFindsOptimal() {
        for (int i = 1; i <= 3; i++) {
            for (int j = 4; j <= 6; j++) {
                addEdge("" + i, "" + j);
            }
        }
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeLocalSearch();
        assertEquals(9, r.getCutEdgeCount());
    }

    // ── K4 ──────────────────────────────────────────────────────────

    @Test
    public void testK4MaxCutIs4() {
        addEdge("A", "B");
        addEdge("A", "C");
        addEdge("A", "D");
        addEdge("B", "C");
        addEdge("B", "D");
        addEdge("C", "D");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(4, r.getCutEdgeCount());
    }

    // ── Path graph ──────────────────────────────────────────────────

    @Test
    public void testPathGraphMaxCut() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("C", "D");
        addEdge("D", "E");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(4, r.getCutEdgeCount());
    }

    // ── Cycle graphs ────────────────────────────────────────────────

    @Test
    public void testEvenCyclePerfectCut() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("C", "D");
        addEdge("D", "A");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(4, r.getCutEdgeCount());
    }

    @Test
    public void testOddCycleMaxCut() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("C", "D");
        addEdge("D", "E");
        addEdge("E", "A");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(4, r.getCutEdgeCount());
    }

    // ── Weighted edges ──────────────────────────────────────────────

    @Test
    public void testWeightedEdges() {
        addWeightedEdge("A", "B", 10.0f);
        addWeightedEdge("B", "C", 1.0f);
        addWeightedEdge("A", "C", 1.0f);
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertTrue(r.getCutValue() >= 11.0);
    }

    @Test
    public void testWeightedEdgesGreedy() {
        addWeightedEdge("A", "B", 5.0f);
        addWeightedEdge("A", "C", 3.0f);
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeGreedy();
        assertTrue(r.getCutValue() >= 5.0);
    }

    // ── Algorithm comparison ────────────────────────────────────────

    @Test
    public void testCompareAlgorithms() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("C", "A");
        List<MaxCutAnalyzer.CutResult> results = new MaxCutAnalyzer(graph).compareAlgorithms();
        assertFalse(results.isEmpty());
        assertTrue(results.size() >= 3);
        for (int i = 1; i < results.size(); i++) {
            assertTrue(results.get(i - 1).getCutValue() >= results.get(i).getCutValue());
        }
    }

    @Test
    public void testCompareIncludesExactForSmall() {
        addEdge("A", "B");
        List<MaxCutAnalyzer.CutResult> results = new MaxCutAnalyzer(graph).compareAlgorithms();
        boolean hasExact = false;
        for (MaxCutAnalyzer.CutResult r : results) {
            if ("Exact".equals(r.getAlgorithm())) hasExact = true;
        }
        assertTrue(hasExact);
    }

    // ── Bounds ──────────────────────────────────────────────────────

    @Test
    public void testUpperBoundEmpty() {
        assertEquals(0.0, new MaxCutAnalyzer(graph).computeUpperBound(), 0.001);
    }

    @Test
    public void testLowerBoundEmpty() {
        assertEquals(0.0, new MaxCutAnalyzer(graph).computeLowerBound(), 0.001);
    }

    @Test
    public void testBoundsTriangle() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("A", "C");
        MaxCutAnalyzer analyzer = new MaxCutAnalyzer(graph);
        double lower = analyzer.computeLowerBound();
        double upper = analyzer.computeUpperBound();
        assertTrue(lower <= upper);
        assertTrue(lower >= 1.0);
    }

    @Test
    public void testExactWithinBounds() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("C", "D");
        addEdge("D", "A");
        MaxCutAnalyzer analyzer = new MaxCutAnalyzer(graph);
        double exact = analyzer.computeExact().getCutValue();
        assertTrue(exact >= analyzer.computeLowerBound());
        assertTrue(exact <= analyzer.computeUpperBound());
    }

    // ── Local search guarantee ──────────────────────────────────────

    @Test
    public void testLocalSearchAtLeastHalfEdges() {
        addEdge("A", "B");
        addEdge("A", "C");
        addEdge("A", "D");
        addEdge("B", "C");
        addEdge("C", "D");
        addEdge("B", "D");
        addEdge("D", "E");
        addEdge("E", "A");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeLocalSearch();
        assertTrue(r.getCutEdgeCount() >= graph.getEdgeCount() / 2);
    }

    // ── Random local search ─────────────────────────────────────────

    @Test
    public void testRandomLocalSearch() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("C", "A");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeRandomLocalSearch();
        assertTrue(r.getCutEdgeCount() >= 2);
        assertEquals("RandomLocalSearch", r.getAlgorithm());
    }

    @Test
    public void testRandomLocalSearchCustomRestarts() {
        addEdge("A", "B");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeRandomLocalSearch(5);
        assertEquals(1, r.getCutEdgeCount());
    }

    @Test(expected = IllegalArgumentException.class)
    public void testRandomLocalSearchZeroRestartsThrows() {
        new MaxCutAnalyzer(graph).computeRandomLocalSearch(0);
    }

    // ── Exact limit ─────────────────────────────────────────────────

    @Test(expected = IllegalStateException.class)
    public void testExactTooManyVerticesThrows() {
        for (int i = 0; i < 21; i++) {
            graph.addVertex("v" + i);
        }
        new MaxCutAnalyzer(graph).computeExact();
    }

    // ── Best ────────────────────────────────────────────────────────

    @Test
    public void testBestUsesExactForSmall() {
        addEdge("A", "B");
        addEdge("B", "C");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeBest();
        assertEquals("Exact", r.getAlgorithm());
    }

    // ── Vertex contributions ────────────────────────────────────────

    @Test
    public void testVertexContributions() {
        addEdge("A", "B");
        addEdge("A", "C");
        MaxCutAnalyzer analyzer = new MaxCutAnalyzer(graph);
        MaxCutAnalyzer.CutResult r = analyzer.computeExact();
        Map<String, Integer> contrib = analyzer.computeVertexContributions(r);
        assertEquals(3, contrib.size());
        int total = 0;
        for (int v : contrib.values()) total += v;
        assertEquals(r.getCutEdgeCount() * 2, total);
    }

    @Test
    public void testVertexContributionsEmpty() {
        Map<String, Integer> contrib =
            new MaxCutAnalyzer(graph).computeVertexContributions(
                new MaxCutAnalyzer(graph).computeGreedy());
        assertTrue(contrib.isEmpty());
    }

    // ── Best flip candidate ─────────────────────────────────────────

    @Test
    public void testFindBestFlipCandidateEmpty() {
        assertNull(new MaxCutAnalyzer(graph).findBestFlipCandidate(
            new MaxCutAnalyzer(graph).computeGreedy()));
    }

    @Test
    public void testFindBestFlipCandidate() {
        addEdge("A", "B");
        addEdge("B", "C");
        MaxCutAnalyzer analyzer = new MaxCutAnalyzer(graph);
        MaxCutAnalyzer.CutResult r = analyzer.computeGreedy();
        String best = analyzer.findBestFlipCandidate(r);
        assertNotNull(best);
        assertTrue(graph.containsVertex(best));
    }

    // ── Balanced cut ────────────────────────────────────────────────

    @Test
    public void testBalancedCut() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("C", "D");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeBalanced(0);
        assertEquals("Balanced", r.getAlgorithm());
        assertTrue(Math.abs(r.getSetS().size() - r.getSetT().size()) <= 1);
    }

    @Test
    public void testBalancedCutWithTolerance() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("C", "D");
        addEdge("D", "E");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeBalanced(1);
        assertTrue(Math.abs(r.getSetS().size() - r.getSetT().size()) <= 2);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testBalancedNegativeToleranceThrows() {
        new MaxCutAnalyzer(graph).computeBalanced(-1);
    }

    @Test
    public void testBalancedEmptyGraph() {
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeBalanced(0);
        assertEquals(0, r.getCutEdgeCount());
    }

    // ── CutResult properties ────────────────────────────────────────

    @Test
    public void testCutResultProperties() {
        addEdge("A", "B");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertNotNull(r.getSetS());
        assertNotNull(r.getSetT());
        assertNotNull(r.getCutEdges());
        assertNotNull(r.getAlgorithm());
        assertEquals(1, r.getTotalEdges());
        assertEquals(1.0, r.getCutRatio(), 0.001);
    }

    @Test
    public void testCutResultSetsAreUnmodifiable() {
        addEdge("A", "B");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        try {
            r.getSetS().add("X");
            fail("Should throw");
        } catch (UnsupportedOperationException e) {
            // expected
        }
    }

    @Test
    public void testCutEdgesUnmodifiable() {
        addEdge("A", "B");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        try {
            r.getCutEdges().add(new edge("f", "X", "Y"));
            fail("Should throw");
        } catch (UnsupportedOperationException e) {
            // expected
        }
    }

    // ── Report generation ───────────────────────────────────────────

    @Test
    public void testReportEmpty() {
        String report = new MaxCutAnalyzer(graph).generateReport();
        assertTrue(report.contains("Empty graph"));
    }

    @Test
    public void testReportTriangle() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("A", "C");
        String report = new MaxCutAnalyzer(graph).generateReport();
        assertTrue(report.contains("MaxCut Analysis Report"));
        assertTrue(report.contains("Bounds"));
        assertTrue(report.contains("Algorithm Comparison"));
        assertTrue(report.contains("Best Cut"));
        assertTrue(report.contains("Vertex Contributions"));
        assertTrue(report.contains("Approximation Quality"));
    }

    @Test
    public void testReportContainsAllAlgorithms() {
        addEdge("A", "B");
        addEdge("B", "C");
        String report = new MaxCutAnalyzer(graph).generateReport();
        assertTrue(report.contains("Greedy"));
        assertTrue(report.contains("LocalSearch"));
        assertTrue(report.contains("RandomLocalSearch"));
        assertTrue(report.contains("Exact"));
    }

    // ── Disconnected graph ──────────────────────────────────────────

    @Test
    public void testDisconnectedGraph() {
        addEdge("A", "B");
        addEdge("C", "D");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(2, r.getCutEdgeCount());
    }

    // ── Star graph ──────────────────────────────────────────────────

    @Test
    public void testStarGraphMaxCut() {
        addEdge("A", "B");
        addEdge("A", "C");
        addEdge("A", "D");
        addEdge("A", "E");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(4, r.getCutEdgeCount());
    }

    // ── Petersen graph ──────────────────────────────────────────────

    @Test
    public void testPetersenGraphExact() {
        addEdge("0", "1"); addEdge("1", "2"); addEdge("2", "3");
        addEdge("3", "4"); addEdge("4", "0");
        addEdge("5", "7"); addEdge("7", "9"); addEdge("9", "6");
        addEdge("6", "8"); addEdge("8", "5");
        addEdge("0", "5"); addEdge("1", "6"); addEdge("2", "7");
        addEdge("3", "8"); addEdge("4", "9");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(12, r.getCutEdgeCount());
    }

    // ── Isolated vertices ───────────────────────────────────────────

    @Test
    public void testIsolatedVertices() {
        graph.addVertex("A");
        graph.addVertex("B");
        graph.addVertex("C");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeGreedy();
        assertEquals(0, r.getCutEdgeCount());
    }

    @Test
    public void testTwoVerticesNoEdge() {
        graph.addVertex("A");
        graph.addVertex("B");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(0, r.getCutEdgeCount());
    }

    // ── Cut ratio ───────────────────────────────────────────────────

    @Test
    public void testCutRatioCalculation() {
        addEdge("A", "B");
        addEdge("B", "C");
        addEdge("A", "C");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeExact();
        double expected = (double) r.getCutEdgeCount() / 3.0;
        assertEquals(expected, r.getCutRatio(), 0.001);
    }

    // ── Random local search empty ───────────────────────────────────

    @Test
    public void testRandomLocalSearchEmpty() {
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeRandomLocalSearch();
        assertEquals(0, r.getCutEdgeCount());
    }

    // ── Best on empty ───────────────────────────────────────────────

    @Test
    public void testBestOnEmpty() {
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeBest();
        assertEquals(0, r.getCutEdgeCount());
    }

    // ── Balanced empty ──────────────────────────────────────────────

    @Test
    public void testBalancedSingleEdge() {
        addEdge("A", "B");
        MaxCutAnalyzer.CutResult r = new MaxCutAnalyzer(graph).computeBalanced(0);
        assertEquals(1, r.getCutEdgeCount());
        assertEquals(1, r.getSetS().size());
        assertEquals(1, r.getSetT().size());
    }

    // ── Large-ish graph heuristic quality ───────────────────────────

    @Test
    public void testLargerGraphHeuristicQuality() {
        // K5: MaxCut = 6 (put 2 on one side, 3 on other: 2*3=6)
        String[] vs = {"A", "B", "C", "D", "E"};
        for (int i = 0; i < vs.length; i++) {
            for (int j = i + 1; j < vs.length; j++) {
                addEdge(vs[i], vs[j]);
            }
        }
        MaxCutAnalyzer.CutResult exact = new MaxCutAnalyzer(graph).computeExact();
        assertEquals(6, exact.getCutEdgeCount());

        MaxCutAnalyzer.CutResult local = new MaxCutAnalyzer(graph).computeLocalSearch();
        assertTrue(local.getCutEdgeCount() >= 5); // at least |E|/2
    }

    // ── Greedy algorithm name ───────────────────────────────────────

    @Test
    public void testGreedyAlgorithmName() {
        addEdge("A", "B");
        assertEquals("Greedy", new MaxCutAnalyzer(graph).computeGreedy().getAlgorithm());
    }

    @Test
    public void testLocalSearchAlgorithmName() {
        addEdge("A", "B");
        assertEquals("LocalSearch", new MaxCutAnalyzer(graph).computeLocalSearch().getAlgorithm());
    }

    @Test
    public void testExactAlgorithmName() {
        addEdge("A", "B");
        assertEquals("Exact", new MaxCutAnalyzer(graph).computeExact().getAlgorithm());
    }
}
