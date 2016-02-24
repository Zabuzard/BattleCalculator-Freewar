package de.zabuza.battleCalculator;

public final class Pair<K, V> {

	private K m_FirstValue;
	private V m_SecondValue;

	public Pair(final K firstValue, final V secondValue) {
		m_FirstValue = firstValue;
		m_SecondValue = secondValue;
	}

	public K getFirstValue() {
		return m_FirstValue;
	}

	public V getSecondValue() {
		return m_SecondValue;
	}

	public void setFirstValue(K firstValue) {
		m_FirstValue = firstValue;
	}

	public void setSecondValue(V secondValue) {
		m_SecondValue = secondValue;
	}
}
