package gvisual;

import edu.uci.ics.jung.graph.Graph;
import java.util.*;

/**
 * Maximum Cut (MaxCut) analyzer for undirected graphs.
 *
 * <p>The <b>Maximum Cut</b> problem partitions vertices into two disjoint sets
 * S and T such that the number (or total weight) of edges crossing the
 * partition is maximized. MaxCut is NP-hard in general, so this analyzer
 * provides multiple algorithms:</p>
 *
 * <ul>
 *   <li><b>Greedy</b> — O(V·E) heuristic that assigns each vertex to the
 *       side that maximizes the current cut</li>
 *   <li><b>Local search</b> — iterative improvement by flipping vertices
 *       until no single flip increases the cut (guaranteed ≥ |E|/2)</li>
 *   <li><b>Random + local search</b> — multiple random restarts with local
 *       search refinement for better solutions</li>
 *   <li><b>Exact (brute-force)</b> — exhaustive enumeration for small graphs
 *       (≤ 20 vertices), guaranteeing the optimal solution</li>
 * </ul>
 *
 * <p>Supports both unweighted and weighted graphs. Weighted cuts sum edge
 * weights; unweighted cuts count edges.</p>
 *
 * <p>Usage:</p>
 * <pre>
 * MaxCutAnalyzer analyzer = new MaxCutAnalyzer(graph);
 * MaxCutAnalyzer.CutResult greedy = analyzer.computeGreedy();
 * MaxCutAnalyzer.CutResult local = analyzer.computeLocalSearch();
 * MaxCutAnalyzer.CutResult best = analyzer.computeBest();
 * MaxCutAnalyzer.CutResult exact = analyzer.computeExact(); // small graphs
 * String report = analyzer.generateReport();
 * </pre>
 *
 * @author zalenix
 */
public class MaxCutAnalyzer {

    private final Graph<String, edge> graph;
    private static final int EXACT_LIMIT = 20;
    private static final int RANDOM_RESTARTS = 25;

    /**
     * Creates a new MaxCutAnalyzer for the given graph.
     *
     * @param graph the JUNG graph to analyze
     * @throws IllegalArgumentException if graph is null
     */
    public MaxCutAnalyzer(Graph<String, edge> graph) {
        if (graph == null) {
            throw new IllegalArgumentException("Graph must not be null");
        }
        this.graph = graph;
    }

    // ── Result class ────────────────────────────────────────────────

    /**
     * Represents a cut partition with analytics.
     */
    public static class CutResult {
        private final Set<String> setS;
        private final Set<String> setT;
        private final double cutValue;
        private final int cutEdgeCount;
        private final List<edge> cutEdges;
        private final String algorithm;
        private final int totalEdges;
        private final double cutRatio;

        public CutResult(Set<String> setS, Set<String> setT,
                          double cutValue, int cutEdgeCount,
                          List<edge> cutEdges, String algorithm,
                          int totalEdges) {
            this.setS = Collections.unmodifiableSet(new LinkedHashSet<String>(setS));
            this.setT = Collections.unmodifiableSet(new LinkedHashSet<String>(setT));
            this.cutValue = cutValue;
            this.cutEdgeCount = cutEdgeCount;
            this.cutEdges = Collections.unmodifiableList(new ArrayList<edge>(cutEdges));
            this.algorithm = algorithm;
            this.totalEdges = totalEdges;
            this.cutRatio = totalEdges > 0 ? (double) cutEdgeCount / totalEdges : 0.0;
        }

        /** Vertices in partition S. */
        public Set<String> getSetS() { return setS; }
        /** Vertices in partition T. */
        public Set<String> getSetT() { return setT; }
        /** Total cut value (edge count for unweighted, weight sum for weighted). */
        public double getCutValue() { return cutValue; }
        /** Number of edges crossing the cut. */
        public int getCutEdgeCount() { return cutEdgeCount; }
        /** The actual edges crossing the cut. */
        public List<edge> getCutEdges() { return cutEdges; }
        /** Algorithm used to compute this cut. */
        public String getAlgorithm() { return algorithm; }
        /** Total edges in the graph. */
        public int getTotalEdges() { return totalEdges; }
        /** Fraction of edges in the cut (cutEdgeCount / totalEdges). */
        public double getCutRatio() { return cutRatio; }
    }

    // ── Greedy algorithm ────────────────────────────────────────────

    /**
     * Greedy MaxCut: processes vertices in decreasing degree order, assigning
     * each to the partition that maximizes the current cut.
     *
     * @return CutResult from greedy algorithm
     */
    public CutResult computeGreedy() {
        Collection<String> vertices = graph.getVertices();
        if (vertices.isEmpty()) {
            return emptyCut("Greedy");
        }

        List<String> sorted = new ArrayList<String>(vertices);
        Collections.sort(sorted, new Comparator<String>() {
            public int compare(String a, String b) {
                return graph.degree(b) - graph.degree(a);
            }
        });

        Set<String> setS = new LinkedHashSet<String>();
        Set<String> setT = new LinkedHashSet<String>();

        for (String v : sorted) {
            int toS = countNeighborsIn(v, setS);
            int toT = countNeighborsIn(v, setT);
            if (toS >= toT) {
                setT.add(v);
            } else {
                setS.add(v);
            }
        }

        return buildResult(setS, setT, "Greedy");
    }

    // ── Local search ────────────────────────────────────────────────

    /**
     * Local search MaxCut: starts from greedy solution and iteratively flips
     * vertices to improve the cut until no single flip helps.
     * Guaranteed to find a cut of at least |E|/2.
     *
     * @return CutResult from local search
     */
    public CutResult computeLocalSearch() {
        Collection<String> vertices = graph.getVertices();
        if (vertices.isEmpty()) {
            return emptyCut("LocalSearch");
        }

        CutResult initial = computeGreedy();
        Set<String> setS = new LinkedHashSet<String>(initial.getSetS());
        Set<String> setT = new LinkedHashSet<String>(initial.getSetT());

        return refineByFlipping(setS, setT, "LocalSearch");
    }

    /**
     * Random restarts with local search refinement. Runs multiple random
     * partitions, refines each with local search, returns the best.
     *
     * @return CutResult from the best random restart
     */
    public CutResult computeRandomLocalSearch() {
        return computeRandomLocalSearch(RANDOM_RESTARTS);
    }

    /**
     * Random restarts with local search refinement using specified restart count.
     *
     * @param restarts number of random restarts
     * @return CutResult from the best random restart
     * @throws IllegalArgumentException if restarts &lt; 1
     */
    public CutResult computeRandomLocalSearch(int restarts) {
        if (restarts < 1) {
            throw new IllegalArgumentException("Restarts must be >= 1");
        }
        Collection<String> vertices = graph.getVertices();
        if (vertices.isEmpty()) {
            return emptyCut("RandomLocalSearch");
        }

        List<String> vertexList = new ArrayList<String>(vertices);
        Random rng = new Random(42);
        CutResult best = null;

        for (int r = 0; r < restarts; r++) {
            Set<String> setS = new LinkedHashSet<String>();
            Set<String> setT = new LinkedHashSet<String>();

            for (String v : vertexList) {
                if (rng.nextBoolean()) {
                    setS.add(v);
                } else {
                    setT.add(v);
                }
            }
            if (setS.isEmpty() && !setT.isEmpty()) {
                String move = setT.iterator().next();
                setT.remove(move);
                setS.add(move);
            } else if (setT.isEmpty() && !setS.isEmpty()) {
                String move = setS.iterator().next();
                setS.remove(move);
                setT.add(move);
            }

            CutResult refined = refineByFlipping(setS, setT, "RandomLocalSearch");
            if (best == null || refined.getCutValue() > best.getCutValue()) {
                best = refined;
            }
        }

        return best;
    }

    // ── Exact (brute-force) ─────────────────────────────────────────

    /**
     * Exact MaxCut via exhaustive enumeration. Only feasible for small graphs
     * (at most 20 vertices).
     *
     * @return CutResult with the optimal partition
     * @throws IllegalStateException if graph has more than 20 vertices
     */
    public CutResult computeExact() {
        Collection<String> vertices = graph.getVertices();
        if (vertices.isEmpty()) {
            return emptyCut("Exact");
        }
        if (vertices.size() > EXACT_LIMIT) {
            throw new IllegalStateException(
                "Exact MaxCut only supported for graphs with <= " + EXACT_LIMIT
                + " vertices (got " + vertices.size() + ")");
        }

        List<String> vertexList = new ArrayList<String>(vertices);
        int n = vertexList.size();
        long totalMasks = 1L << n;

        double bestValue = -1;
        long bestMask = 0;

        for (long mask = 0; mask < totalMasks; mask++) {
            double value = evaluateCutByMask(vertexList, mask);
            if (value > bestValue) {
                bestValue = value;
                bestMask = mask;
            }
        }

        Set<String> setS = new LinkedHashSet<String>();
        Set<String> setT = new LinkedHashSet<String>();
        for (int i = 0; i < n; i++) {
            if ((bestMask & (1L << i)) != 0) {
                setS.add(vertexList.get(i));
            } else {
                setT.add(vertexList.get(i));
            }
        }

        return buildResult(setS, setT, "Exact");
    }

    // ── Best effort ─────────────────────────────────────────────────

    /**
     * Computes the best cut using exact algorithm for small graphs,
     * random local search for larger ones.
     *
     * @return the best CutResult available
     */
    public CutResult computeBest() {
        if (graph.getVertexCount() <= EXACT_LIMIT) {
            return computeExact();
        }
        return computeRandomLocalSearch();
    }

    // ── Upper bound ─────────────────────────────────────────────────

    /**
     * Computes an upper bound on the maximum cut value.
     *
     * @return upper bound on maximum cut value
     */
    public double computeUpperBound() {
        int edgeCount = graph.getEdgeCount();
        int n = graph.getVertexCount();
        if (n <= 1 || edgeCount == 0) {
            return 0.0;
        }

        double totalWeight = 0;
        for (edge e : graph.getEdges()) {
            totalWeight += Math.max(e.getWeight(), 1.0f);
        }

        double edwardsBound = (double) edgeCount / 2.0 + (double) (n - 1) / 4.0;

        return Math.min(totalWeight, edwardsBound);
    }

    /**
     * Computes a lower bound on MaxCut (any cut is at least |E|/2 for unweighted).
     *
     * @return lower bound value
     */
    public double computeLowerBound() {
        int edgeCount = graph.getEdgeCount();
        if (edgeCount == 0) return 0.0;
        return (double) edgeCount / 2.0;
    }

    // ── Vertex analysis ─────────────────────────────────────────────

    /**
     * Computes how many cut edges each vertex participates in.
     *
     * @param result a CutResult to analyze
     * @return map from vertex to its cut contribution count
     */
    public Map<String, Integer> computeVertexContributions(CutResult result) {
        Map<String, Integer> contributions = new LinkedHashMap<String, Integer>();
        for (String v : graph.getVertices()) {
            contributions.put(v, 0);
        }
        for (edge e : result.getCutEdges()) {
            String v1 = e.getVertex1();
            String v2 = e.getVertex2();
            if (contributions.containsKey(v1)) {
                contributions.put(v1, contributions.get(v1) + 1);
            }
            if (contributions.containsKey(v2)) {
                contributions.put(v2, contributions.get(v2) + 1);
            }
        }
        return contributions;
    }

    /**
     * Finds the vertex whose flip would most improve the cut.
     *
     * @param result current cut result
     * @return the vertex ID that should be flipped, or null if empty
     */
    public String findBestFlipCandidate(CutResult result) {
        if (graph.getVertexCount() == 0) return null;

        String bestVertex = null;
        double bestGain = Double.NEGATIVE_INFINITY;

        for (String v : graph.getVertices()) {
            double gain = computeFlipGain(v, result.getSetS(), result.getSetT());
            if (gain > bestGain) {
                bestGain = gain;
                bestVertex = v;
            }
        }
        return bestVertex;
    }

    // ── Partition balance ───────────────────────────────────────────

    /**
     * Computes a balanced MaxCut where partition sizes differ by at most tolerance.
     *
     * @param tolerance maximum allowed size difference between partitions
     * @return CutResult respecting the balance constraint
     * @throws IllegalArgumentException if tolerance is negative
     */
    public CutResult computeBalanced(int tolerance) {
        if (tolerance < 0) {
            throw new IllegalArgumentException("Tolerance must be >= 0");
        }
        Collection<String> vertices = graph.getVertices();
        if (vertices.isEmpty()) {
            return emptyCut("Balanced");
        }

        List<String> sorted = new ArrayList<String>(vertices);
        Collections.sort(sorted, new Comparator<String>() {
            public int compare(String a, String b) {
                return graph.degree(b) - graph.degree(a);
            }
        });

        int n = sorted.size();
        int half = n / 2;
        Set<String> setS = new LinkedHashSet<String>();
        Set<String> setT = new LinkedHashSet<String>();

        // Initial greedy assignment respecting balance
        for (String v : sorted) {
            int toS = countNeighborsIn(v, setS);
            int toT = countNeighborsIn(v, setT);
            boolean preferT = toS >= toT;

            if (preferT && setT.size() < half + tolerance + 1) {
                setT.add(v);
            } else if (!preferT && setS.size() < half + tolerance + 1) {
                setS.add(v);
            } else if (setS.size() < setT.size()) {
                setS.add(v);
            } else {
                setT.add(v);
            }
        }

        // Local search with balance constraint
        boolean improved = true;
        while (improved) {
            improved = false;
            for (String v : new ArrayList<String>(graph.getVertices())) {
                boolean inS = setS.contains(v);
                Set<String> from = inS ? setS : setT;
                Set<String> to = inS ? setT : setS;

                if (Math.abs((from.size() - 1) - (to.size() + 1)) > tolerance) {
                    continue;
                }

                double gain = computeFlipGain(v, setS, setT);
                if (gain > 0) {
                    from.remove(v);
                    to.add(v);
                    improved = true;
                }
            }
        }

        return buildResult(setS, setT, "Balanced");
    }

    // ── Compare algorithms ──────────────────────────────────────────

    /**
     * Runs all heuristic algorithms and returns results sorted by cut value descending.
     *
     * @return list of CutResults from all algorithms
     */
    public List<CutResult> compareAlgorithms() {
        List<CutResult> results = new ArrayList<CutResult>();
        results.add(computeGreedy());
        results.add(computeLocalSearch());
        results.add(computeRandomLocalSearch());

        if (graph.getVertexCount() <= EXACT_LIMIT) {
            results.add(computeExact());
        }

        Collections.sort(results, new Comparator<CutResult>() {
            public int compare(CutResult a, CutResult b) {
                return Double.compare(b.getCutValue(), a.getCutValue());
            }
        });

        return results;
    }

    // ── Report generation ───────────────────────────────────────────

    /**
     * Generates a comprehensive MaxCut analysis report.
     *
     * @return formatted text report
     */
    public String generateReport() {
        StringBuilder sb = new StringBuilder();
        sb.append("=== MaxCut Analysis Report ===\n\n");

        int n = graph.getVertexCount();
        int m = graph.getEdgeCount();
        sb.append("Graph: ").append(n).append(" vertices, ")
          .append(m).append(" edges\n\n");

        if (n == 0) {
            sb.append("Empty graph — no cut possible.\n");
            return sb.toString();
        }

        sb.append("── Bounds ──\n");
        sb.append(String.format("  Lower bound (|E|/2): %.1f\n", computeLowerBound()));
        sb.append(String.format("  Upper bound: %.1f\n\n", computeUpperBound()));

        List<CutResult> results = compareAlgorithms();

        sb.append("── Algorithm Comparison ──\n");
        for (CutResult r : results) {
            sb.append(String.format("  %-20s  cut=%.1f  edges=%d/%d (%.1f%%)\n",
                r.getAlgorithm(), r.getCutValue(), r.getCutEdgeCount(),
                r.getTotalEdges(), r.getCutRatio() * 100));
        }
        sb.append("\n");

        CutResult best = results.get(0);
        sb.append("── Best Cut (").append(best.getAlgorithm()).append(") ──\n");
        sb.append("  Set S (").append(best.getSetS().size()).append("): ")
          .append(best.getSetS()).append("\n");
        sb.append("  Set T (").append(best.getSetT().size()).append("): ")
          .append(best.getSetT()).append("\n");
        sb.append(String.format("  Cut value: %.1f\n", best.getCutValue()));
        sb.append(String.format("  Cut ratio: %.1f%%\n", best.getCutRatio() * 100));

        sb.append("\n── Vertex Contributions ──\n");
        Map<String, Integer> contributions = computeVertexContributions(best);
        List<Map.Entry<String, Integer>> sortedEntries =
            new ArrayList<Map.Entry<String, Integer>>(contributions.entrySet());
        Collections.sort(sortedEntries, new Comparator<Map.Entry<String, Integer>>() {
            public int compare(Map.Entry<String, Integer> a, Map.Entry<String, Integer> b) {
                return b.getValue() - a.getValue();
            }
        });
        int shown = 0;
        for (Map.Entry<String, Integer> entry : sortedEntries) {
            if (shown >= 10) {
                sb.append("  ... (").append(sortedEntries.size() - 10).append(" more)\n");
                break;
            }
            String side = best.getSetS().contains(entry.getKey()) ? "S" : "T";
            sb.append(String.format("  %-10s [%s]  contribution=%d\n",
                entry.getKey(), side, entry.getValue()));
            shown++;
        }

        if (graph.getVertexCount() <= EXACT_LIMIT) {
            CutResult exact = null;
            for (CutResult r : results) {
                if ("Exact".equals(r.getAlgorithm())) {
                    exact = r;
                    break;
                }
            }
            if (exact != null && exact.getCutValue() > 0) {
                sb.append("\n── Approximation Quality ──\n");
                for (CutResult r : results) {
                    if (!"Exact".equals(r.getAlgorithm())) {
                        double ratio = r.getCutValue() / exact.getCutValue();
                        sb.append(String.format("  %s: %.1f%% of optimal\n",
                            r.getAlgorithm(), ratio * 100));
                    }
                }
            }
        }

        return sb.toString();
    }

    // ── Private helpers ─────────────────────────────────────────────

    private int countNeighborsIn(String v, Set<String> set) {
        int count = 0;
        Collection<String> neighbors = graph.getNeighbors(v);
        if (neighbors != null) {
            for (String n : neighbors) {
                if (set.contains(n)) {
                    count++;
                }
            }
        }
        return count;
    }

    private double weightedNeighborsIn(String v, Set<String> set) {
        double total = 0;
        Collection<edge> incidentEdges = graph.getIncidentEdges(v);
        if (incidentEdges != null) {
            for (edge e : incidentEdges) {
                String other = GraphUtils.getOtherEnd(e, v);
                if (other != null && set.contains(other)) {
                    total += Math.max(e.getWeight(), 1.0f);
                }
            }
        }
        return total;
    }

    private double computeFlipGain(String v, Set<String> setS, Set<String> setT) {
        boolean inS = setS.contains(v);
        Set<String> own = inS ? setS : setT;
        Set<String> other = inS ? setT : setS;
        double toOwn = weightedNeighborsIn(v, own);
        double toOther = weightedNeighborsIn(v, other);
        return toOwn - toOther;
    }

    private CutResult refineByFlipping(Set<String> setS, Set<String> setT, String algorithm) {
        boolean improved = true;
        while (improved) {
            improved = false;
            for (String v : new ArrayList<String>(graph.getVertices())) {
                double gain = computeFlipGain(v, setS, setT);
                if (gain > 1e-9) {
                    if (setS.contains(v)) {
                        setS.remove(v);
                        setT.add(v);
                    } else {
                        setT.remove(v);
                        setS.add(v);
                    }
                    improved = true;
                }
            }
        }
        return buildResult(setS, setT, algorithm);
    }

    private double evaluateCutByMask(List<String> vertexList, long mask) {
        double cutValue = 0;
        for (edge e : graph.getEdges()) {
            int i1 = vertexList.indexOf(e.getVertex1());
            int i2 = vertexList.indexOf(e.getVertex2());
            if (i1 < 0 || i2 < 0) continue;
            boolean s1 = (mask & (1L << i1)) != 0;
            boolean s2 = (mask & (1L << i2)) != 0;
            if (s1 != s2) {
                cutValue += Math.max(e.getWeight(), 1.0f);
            }
        }
        return cutValue;
    }

    private CutResult buildResult(Set<String> setS, Set<String> setT, String algorithm) {
        double cutValue = 0;
        int cutEdgeCount = 0;
        List<edge> cutEdges = new ArrayList<edge>();

        for (edge e : graph.getEdges()) {
            String v1 = e.getVertex1();
            String v2 = e.getVertex2();
            boolean v1inS = setS.contains(v1);
            boolean v2inS = setS.contains(v2);
            if (v1inS != v2inS) {
                cutEdges.add(e);
                cutEdgeCount++;
                cutValue += Math.max(e.getWeight(), 1.0f);
            }
        }

        return new CutResult(setS, setT, cutValue, cutEdgeCount, cutEdges,
                             algorithm, graph.getEdgeCount());
    }

    private CutResult emptyCut(String algorithm) {
        return new CutResult(
            new LinkedHashSet<String>(), new LinkedHashSet<String>(),
            0.0, 0, new ArrayList<edge>(), algorithm, 0);
    }
}
