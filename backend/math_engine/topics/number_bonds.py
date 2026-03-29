import re
from typing import Optional, Dict, Any, Tuple
from ..word_problem_parser import _parse_number, _format_number

def solve_number_bonds(question: str) -> Optional[Dict[str, Any]]:
    """
    Solves basic number bond / composition questions.
    Patterns:
    - "8 needs ___ to make 10" -> Part1=8, Whole=10
    - "Adding ___ to 8 to make 10" -> Part1=8, Whole=10
    - "3 can be split into ___ and ___" -> Whole=3
    - "10 and 2 make ___" -> Part1=10, Part2=2
    """
    q_lower = question.lower()
    
    # 1. "X needs ___ to make Y" OR "Adding ___ to X to make Y"
    # Examples: "8 needs ___ to make 10", "What does 8 need to make 10"
    needs_match = re.search(r"\b(\d+)\s+needs?.*to make\s+(\d+)\b", q_lower)
    adding_match = re.search(r"add.*\bto\s+(\d+)\s+to make\s+(\d+)\b", q_lower)
    if needs_match or adding_match:
        match = needs_match if needs_match else adding_match
        part1 = _parse_number(match.group(1))
        whole = _parse_number(match.group(2))
        
        if whole >= part1:
            part2 = whole - part1
            
            p1_fmt = _format_number(part1)
            p2_fmt = _format_number(part2)
            w_fmt = _format_number(whole)
            
            return {
                "topic": "number_bonds",
                "answer": str(p2_fmt),
                "steps": [
                    {"title": "Identify the whole", "text": f"We want to make {w_fmt}."},
                    {"title": "Identify the part", "text": f"We already have {p1_fmt}."},
                    {"title": "Find the missing part", "text": f"{w_fmt} - {p1_fmt} = {p2_fmt}."},
                    {"title": "Number Bond", "text": f"So, {p1_fmt} and {p2_fmt} make {w_fmt}."}
                ],
                "bond_data": {
                    "whole": w_fmt,
                    "part1": p1_fmt,
                    "part2": p2_fmt,
                    "missing": "part2"
                }
            }

    # 2. "X can be split into ___ and ___"
    split_match = re.search(r"\b(\d+)\s+can be split into\b", q_lower)
    if split_match:
        whole = _parse_number(split_match.group(1))
        # Default split: roughly in half
        part1 = whole // 2
        part2 = whole - part1
        
        p1_fmt = _format_number(part1)
        p2_fmt = _format_number(part2)
        w_fmt = _format_number(whole)
        
        return {
            "topic": "number_bonds",
            "answer": f"{p1_fmt} and {p2_fmt}",
            "steps": [
                {"title": "Identify the whole", "text": f"The total number is {w_fmt}."},
                {"title": "Split the number", "text": f"We can break {w_fmt} into two parts."},
                {"title": "Number Bond", "text": f"One way is: {p1_fmt} and {p2_fmt} make {w_fmt}."}
            ],
            "bond_data": {
                "whole": w_fmt,
                "part1": p1_fmt,
                "part2": p2_fmt,
                "missing": "split"
            }
        }
        
    # 3. "X and Y make ___" 
    make_match = re.search(r"\b(\d+)\s+and\s+(\d+)\s+(make|makes|is)\b", q_lower)
    if make_match:
        part1 = _parse_number(make_match.group(1))
        part2 = _parse_number(make_match.group(2))
        whole = part1 + part2
        
        p1_fmt = _format_number(part1)
        p2_fmt = _format_number(part2)
        w_fmt = _format_number(whole)
        
        return {
            "topic": "number_bonds",
            "answer": str(w_fmt),
            "steps": [
                {"title": "Identify the parts", "text": f"The parts are {p1_fmt} and {p2_fmt}."},
                {"title": "Combine the parts", "text": f"{p1_fmt} + {p2_fmt} = {w_fmt}."},
                {"title": "Number Bond", "text": f"So, {p1_fmt} and {p2_fmt} make {w_fmt}."}
            ],
            "bond_data": {
                "whole": w_fmt,
                "part1": p1_fmt,
                "part2": p2_fmt,
                "missing": "whole"
            }
        }
    
    # 4. Fallback for "Adding ___ to X to make Y" if strictly written as numbers
    add_match = re.search(r"(\d+)\s*\+\s*_\+_\s*=\s*(\d+)", q) # handles X + ___ = Y
    if not add_match:
        add_match = re.search(r"_\*_\s*\+\s*(\d+)\s*=\s*(\d+)", q)
        
    if add_match:
        # Not doing full regex algebra here, keeping it to standard word questions for now.
        pass

    return None
