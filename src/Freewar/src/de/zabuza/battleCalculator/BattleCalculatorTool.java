package de.zabuza.battleCalculator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map.Entry;

/**
 * Utility tool for processing NPC data.
 * 
 * @author Zabuza
 * 
 */
public final class BattleCalculatorTool {
	/**
	 * Path to the file that contains external data.
	 */
	private static final File FILEPATH = new File(System.getProperty("user.home"), "Desktop");
	/**
	 * Name of the NPC data map in javascript.
	 */
	private static final String JS_MAP_NAME = "npcData";
	/**
	 * Separator used for data.
	 */
	private static final String SEPARATOR = ";";

	/**
	 * Gets the content of a file and returns it as list of lines.
	 * 
	 * @param path
	 *            Path to the file
	 * @return List of lines from the content
	 * @throws IOException
	 *             If an I/O-Exception occurs
	 */
	public static List<String> getFileContent(final File path) throws IOException {
		try (final BufferedReader file = new BufferedReader(new InputStreamReader(new FileInputStream(path)));) {
			List<String> content = new ArrayList<>();

			String line = file.readLine();
			while (line != null) {
				content.add(line);
				line = file.readLine();
			}
			return content;
		}
	}

	/**
	 * Gets the content of a file that contains a table of NPC data and
	 * processes it.
	 * 
	 * @param args
	 *            Not supported
	 * @throws IOException
	 *             If an I/O-Exception occurred
	 */
	public static void main(final String[] args) throws IOException {

		String filename = "npcData.csv";
		List<String> list = getFileContent(new File(FILEPATH, filename));
		printNpcDataAsJsMap(processNpcData(list));
	}

	/**
	 * Prints the given NPC data as Javascript map to the standard console.
	 * 
	 * @param npcData
	 *            The data to print
	 */
	private static void printNpcDataAsJsMap(final HashMap<String, Pair<Integer, Integer>> npcData) {
		System.out.println("\t// NPC Data Begin");
		for (Entry<String, Pair<Integer, Integer>> entry : npcData.entrySet()) {
			// npcData['26-köpfiger Salamander'] = [67, 25000];

			String name = entry.getKey();
			Integer strength = entry.getValue().getFirst();
			Integer life = entry.getValue().getSecond();

			String line = "\t" + JS_MAP_NAME + "['";
			line += name + "'] = [";
			line += strength + ", " + life + "];";

			System.out.println(line);
		}
		System.out.println("\t// NPC Data End");
	}

	/**
	 * Processes a given list of NPC data
	 * 
	 * @param rawNpcData
	 *            Data to process
	 * @return Processed NPC data
	 */
	private static HashMap<String, Pair<Integer, Integer>> processNpcData(final List<String> rawNpcData) {
		LinkedHashMap<String, Pair<Integer, Integer>> npcData = new LinkedHashMap<>();

		for (String dataLine : rawNpcData) {
			String[] data = dataLine.split(SEPARATOR);

			String name = data[0];
			name = name.replaceAll("\\(.*\\)", "");
			name = validateNpcName(name);

			int strength = Integer.parseInt(data[1]);
			int life = Integer.parseInt(data[2]);

			if (!npcData.containsKey(name)) {
				npcData.put(name, new Pair<>(Integer.valueOf(strength), Integer.valueOf(life)));
			} else {
				Pair<Integer, Integer> npcValues = npcData.get(name);
				if (npcValues.getFirst().intValue() < strength) {
					npcValues.setFirst(Integer.valueOf(strength));
				}
				if (npcValues.getSecond().intValue() < life) {
					npcValues.setSecond(Integer.valueOf(life));
				}
			}
		}

		return npcData;
	}

	/**
	 * Validates the name of a given NPC.
	 * 
	 * @param name
	 *            Name to validate
	 * @return Validated NPC name
	 */
	private static String validateNpcName(final String name) {
		if (name.equals("Lava Echse")) {
			return "Lava-Echse";
		} else if (name.equals("Magier des Schutzes")) {
			return "Der Magier des Schutzes";
		}

		return name;
	}

	/**
	 * Utility class. No implementation.
	 */
	private BattleCalculatorTool() {

	}
}
