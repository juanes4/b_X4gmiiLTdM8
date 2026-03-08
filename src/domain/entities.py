from dataclasses import dataclass, field
from typing import List, Optional
from abc import ABC, abstractmethod

@dataclass
class Player:
  name: str
  age: int
  position: str
  number: int

@dataclass
class Team:
  name: str
  country: str
  city: str
  abbreviation: str
  logo: str
  points: int = field(default=0)
  goals: list = field(default_factory=list)
  goals_for: int = field(default=0)
  goals_against: int = field(default=0)
  state: str = field(default="active")
  players: list[Player] = field(default_factory=list)

@dataclass
class Match:
  team1: Team
  team2: Team
  score_team1: Optional[int] = field(default=None)
  score_team2: Optional[int] = field(default=None)
  winner: Optional[Team] = field(default=None)

@dataclass
class League:
  name: str
  teams: List[Team] = field(default_factory=list)
  rounds: List[List[Match]] = field(default_factory=list)
  current_round: int = field(default=0)
  matches: List[Match] = field(default_factory=list)