package de.zabuza.battleCalculator;

import java.io.BufferedReader;
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
	private static final String FILEPATH = "";
	/**
	 * Separator used for data.
	 */
	private static final String SEPARATOR = ";";
	/**
	 * Name of the NPC data map in javascript.
	 */
	private static final String JS_MAP_NAME = "npcData";

	/**
	 * Gets the content of a file and returns it as list of lines.
	 * 
	 * @param path
	 *            Path to the file
	 * @return List of lines from the content
	 * @throws IOException
	 *             If an I/O-Exception occurs
	 */
	public static List<String> getFileContent(String path) throws IOException {
		BufferedReader file = new BufferedReader(new InputStreamReader(
				new FileInputStream(path)));
		List<String> content = new ArrayList<String>();

		String line = file.readLine();
		while (line != null) {
			content.add(line);
			line = file.readLine();
		}

		file.close();
		return content;
	}

	/**
	 * Gets the content of a file that contains a table of NPC data and
	 * processes it.
	 * 
	 * @param args
	 *            Not supported
	 * @throws IOException
	 */
	public static void main(final String[] args) throws IOException {

		String filename = "npcData.csv";
		List<String> list = getFileContent(FILEPATH + filename);
		printNpcDataAsJsMap(processNpcData(list));
	}

	private static void printNpcDataAsJsMap(
			final HashMap<String, Pair<Integer, Integer>> npcData) {
		System.out.println("\t// NPC Data Begin");
		for (Entry<String, Pair<Integer, Integer>> entry : npcData.entrySet()) {
			// npcData['26-köpfiger Salamander'] = [67, 25000];

			String name = entry.getKey();
			Integer strength = entry.getValue().getFirstValue();
			Integer life = entry.getValue().getSecondValue();

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
	private static HashMap<String, Pair<Integer, Integer>> processNpcData(
			final List<String> rawNpcData) {
		LinkedHashMap<String, Pair<Integer, Integer>> npcData = new LinkedHashMap<>();

		for (String dataLine : rawNpcData) {
			String[] data = dataLine.split(SEPARATOR);

			String name = data[0];
			name = name.replaceAll("\\(.*\\)", "");
			name = validateNpcName(name);

			int strength = Integer.parseInt(data[1]);
			int life = Integer.parseInt(data[2]);

			if (!npcData.containsKey(name)) {
				npcData.put(name, new Pair<>(strength, life));
			} else {
				Pair<Integer, Integer> npcValues = npcData.get(name);
				if (npcValues.getFirstValue() < strength) {
					npcValues.setFirstValue(strength);
				}
				if (npcValues.getSecondValue() < life) {
					npcValues.setSecondValue(life);
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
		if (name.equals("Wolf der Finsternis")) {
			return "Der Wolf der Finsternis";
		} else if (name.equals("Nebelkröte")) {
			return "Die Nebelkröte";
		} else if (name.equals("Nebelwesen")) {
			return "Das Nebelwesen";
		} else if (name.equals("Lava Echse")) {
			return "Lava-Echse";
		} else if (name.equals("Schattenwesen")) {
			return "Ein Schattenwesen";
		} else if (name.equals("Nebelkrähe")) {
			return "Die Nebelkrähe";
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
