using HtmlAgilityPack;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Freewar_Converter
{
    internal class Program
    {
        static List<Data> dataList = new List<Data>();

        public static void Resistenz()
        {
            var web = new HtmlWeb();
            var doc = web.Load("https://www.fwwiki.de/index.php/Resistenz-NPCs_(Liste)");

            var trElements = doc.DocumentNode.Descendants("tr")
            .Where(x => x.Descendants("td").FirstOrDefault()?.Attributes["style"] != null &&
            x.Descendants("td").FirstOrDefault()?.Attributes["style"].Value == "text-align:left;");

            foreach (var trElement in trElements)
            {
                var tdElements = trElement.Descendants("td").ToList();
                var aElement = tdElements[0].Descendants("a").FirstOrDefault();

                if (aElement != null)
                {
                    string name = aElement.InnerHtml;
                    string strength = tdElements[1].InnerHtml;
                    string health = tdElements[2].InnerHtml;
                    string category = tdElements[8].InnerHtml.Replace("\n", "");

                    dataList.Add(new Data(name, strength, health, category));
                }
            }
        }
        public static void Gruppen()
        {
            var web = new HtmlWeb();
            var doc = web.Load("https://www.fwwiki.de/index.php/Gruppen-NPCs_(Liste)");

            var trElements = doc.DocumentNode.Descendants("tr")
            .Where(x => x.Descendants("td").FirstOrDefault()?.Attributes["style"] != null &&
            x.Descendants("td").FirstOrDefault()?.Attributes["style"].Value == "text-align:left;");

            foreach (var trElement in trElements)
            {
                var tdElements = trElement.Descendants("td").ToList();
                var aElement = tdElements[0].Descendants("a").FirstOrDefault();

                if (aElement != null)
                {
                    string name = aElement.InnerHtml;
                    string strength = tdElements[1].Descendants("span").FirstOrDefault().InnerHtml.Split('>')[2];
                    string health = tdElements[2].Descendants("span").FirstOrDefault().InnerHtml.Split('>')[2];
                    string category = "Gruppen-NPC";

                    dataList.Add(new Data(name, strength, health, category));
                }
            }
        }
        public static void Unique()
        {
            var web = new HtmlWeb();
            var doc = web.Load("https://www.fwwiki.de/index.php/Unique-NPCs_(Liste)");

            var trElements = doc.DocumentNode.Descendants("tr")
            .Where(x => x.Descendants("td").FirstOrDefault()?.Attributes["style"] != null &&
            x.Descendants("td").FirstOrDefault()?.Attributes["style"].Value == "text-align:left;");

            foreach (var trElement in trElements)
            {
                var tdElements = trElement.Descendants("td").ToList();
                var aElement = tdElements[0].Descendants("a").FirstOrDefault();

                if (aElement != null)
                {
                    string name = aElement.InnerHtml;
                    string strength = tdElements[1].Descendants("span").FirstOrDefault().InnerHtml.Split('>')[2];
                    string health = tdElements[2].Descendants("span").FirstOrDefault().InnerHtml.Split('>')[2];
                    string category = "Unique-NPC";

                    dataList.Add(new Data(name, strength, health, category));
                }
            }
        }
        public static void Npc()
        {
            var web = new HtmlWeb();
            var doc = web.Load("https://www.fwwiki.de/index.php/NPCs_(Liste)");

            var trElements = doc.DocumentNode.Descendants("tr")
            .Where(x => x.Descendants("td").FirstOrDefault()?.Attributes["style"] != null &&
            x.Descendants("td").FirstOrDefault()?.Attributes["style"].Value == "text-align:left;");

            foreach (var trElement in trElements)
            {
                var tdElements = trElement.Descendants("td").ToList();
                var aElement = tdElements[0].Descendants("a").FirstOrDefault();

                if (aElement != null)
                {
                    string name = aElement.InnerHtml;
                    string strength = tdElements[1].InnerHtml;
                    string health = tdElements[2].InnerHtml;
                    string category = "NPC";

                    dataList.Add(new Data(name, strength, health, category));
                }
            }
        }

        [STAThreadAttribute]
        static void Main(string[] args)
        {
            Resistenz();
            Gruppen();
            Unique();
            Npc();

            var Superresistenz_Search = dataList.FindAll(x => x.Category.Contains("Superresistenz")).ToList();
            var Resistenz_Search = dataList.FindAll(x => x.Category.Contains("Resistenz")).ToList();
            var Gruppe_Search = dataList.FindAll(x => x.Category.Contains("Gruppe")).ToList();
            var Unique_Search = dataList.FindAll(x => x.Category.Contains("Unique")).ToList();
            var NPC_Search = dataList.FindAll(x => x.Category == "NPC").ToList();

            var sb_unique = new StringBuilder();
            sb_unique.AppendLine("// Unique-NPC");
            for (int i = 0; i < Unique_Search.Count(); i++)
            {
                sb_unique.AppendLine("nonCritSpecialNpc['" + Unique_Search[i].Name + "'] = true;");
            }
            sb_unique.AppendLine("// Group-NPC");
            for (int i = 0; i < Gruppe_Search.Count(); i++)
            {
                sb_unique.AppendLine("nonCritSpecialNpc['" + Gruppe_Search[i].Name + "'] = true;");
            }
            DialogResult dialogResult = MessageBox.Show("This is Unique and Group NPC Category....\n\nClick ok, the program is auto copy to clipboard, just replace the new data in the javascript script :D ", "Copy to clipboard...", MessageBoxButtons.OK);
            if (dialogResult == DialogResult.OK)
            {
                Clipboard.SetText(sb_unique.ToString());

            }

            var sb_resistenz = new StringBuilder();
            sb_resistenz.AppendLine("// Resistance NPC");
            for (int i = 0; i < Resistenz_Search.Count(); i++)
            {
                sb_resistenz.AppendLine("critSpecialNpc['" + Resistenz_Search[i].Name + "'] = true;");
            }
            sb_resistenz.AppendLine("// Super Resistance NPC");
            for (int i = 0; i < Superresistenz_Search.Count(); i++)
            {
                sb_resistenz.AppendLine("critSpecialNpc['" + Superresistenz_Search[i].Name + "'] = true;");
            }
            DialogResult dialogResult1 = MessageBox.Show("This is Resistance and Super Resistance NPC Category....\n\nClick ok, the program is auto copy to clipboard, just replace the new data in the javascript script :D ", "Copy to clipboard...", MessageBoxButtons.OK);
            if (dialogResult1 == DialogResult.OK)
            {
                Clipboard.SetText(sb_resistenz.ToString());

            }

            var sb_npc = new StringBuilder();
            sb_npc.AppendLine("// NPC Data Begin");
            for (int i = 0; i < NPC_Search.Count(); i++)
            {
                sb_npc.AppendLine("npcData['" + NPC_Search[i].Name + "'] = [" + NPC_Search[i].Stärke + ", " + NPC_Search[i].Leben + "];");
            }
            DialogResult dialogResult2 = MessageBox.Show("This is NPC Category....\n\nClick ok, the program is auto copy to clipboard, just replace the new data in the javascript script :D ", "Copy to clipboard...", MessageBoxButtons.OK);
            if (dialogResult2 == DialogResult.OK)
            {
                Clipboard.SetText(sb_npc.ToString());

            }
        }
        class Data
        {
            public string Name { get; set; }
            public string Stärke { get; set; }
            public string Leben { get; set; }
            public string Category { get; set; }

    public Data(string name, string stärke, string leben, string category)
            {
                Name = name;
                Stärke = stärke;
                Leben = leben;
                Category = category;
            }
        }
    }
}
