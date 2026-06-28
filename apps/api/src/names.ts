// Склонение русского имени в родительный падеж («у кого?»): «Анжелина» → «Анжелины».
// Эвристика для имён сотрудников (набор небольшой и известный). Склоняем первое слово (имя),
// остальные части (если есть) оставляем как есть. Неоднозначные случаи (имена на -ь) не трогаем.

function declineGenitiveWord(word: string): string {
  if (!word) return word;
  const lower = word.toLowerCase();
  const last = lower.slice(-1);

  // -ия → -ии (Мария→Марии, Виктория→Виктории)
  if (lower.endsWith("ия")) return word.slice(0, -2) + "ии";
  // -я → -и (Аня→Ани, Настя→Насти, Илья→Ильи, Андрей уже ниже)
  if (last === "я") return word.slice(0, -1) + "и";
  // -а → -ы, но после г/к/х/ж/ч/ш/щ пишем -и (Наташа→Наташи, Ольга→Ольги, Анна→Анны)
  if (last === "а") {
    const prev = lower.slice(-2, -1);
    const useI = "гкхжчшщ".includes(prev);
    return word.slice(0, -1) + (useI ? "и" : "ы");
  }
  // -й → -я (Андрей→Андрея, Николай→Николая, Сергей→Сергея)
  if (last === "й") return word.slice(0, -1) + "я";
  // -ь — неоднозначно (муж. Игорь→Игоря vs жен. Любовь→Любови), не склоняем
  if (last === "ь") return word;
  // согласная (муж. имя) → +а (Иван→Ивана, Данил→Данила, Денис→Дениса)
  if ("бвгджзклмнпрстфхцчшщ".includes(last)) return word + "а";
  // гласные о/е/у/и/ы/э/ю и прочее — несклоняемое
  return word;
}

export function genitiveFirstName(fullName: string): string {
  const name = (fullName || "").trim();
  if (!name) return name;
  const parts = name.split(/\s+/);
  parts[0] = declineGenitiveWord(parts[0]);
  return parts.join(" ");
}
