# Grammaire du pseudo-code — Algo Éditeur INSTI

Version : `1.0`
Statut : figée pour le MVP
Source de vérité : `src/interpreter/keywords.js`

## 1. Structure générale

    Algorithme <Nom>
    Variables
        <déclarations>
    Début
        <instructions>
    Fin

## 2. EBNF

```ebnf
programme       = "Algorithme" identificateur
                  declaration_variables?
                  "Début" bloc_instructions "Fin" ;

declaration_variables = "Variables" { declaration } ;
declaration     = identificateur { "," identificateur } ":" type ;
type            = "entier" | "réel" | "booléen" | "caractère" | "chaine"
                | "tableau" "[" entier ".." entier "]" "de" type ;

bloc_instructions = { instruction } ;

instruction     = affectation
                | condition
                | boucle_tantque
                | boucle_pour
                | appel ;

affectation     = identificateur ( "←" | "<-" | ":=" ) expression ;

condition       = "Si" expression "Alors"
                  bloc_instructions
                  [ "Sinon" bloc_instructions ]
                  "FinSi" ;

boucle_tantque  = "TantQue" expression "Faire"
                  bloc_instructions
                  "FinTantQue" ;

boucle_pour     = "Pour" identificateur "de" expression "à" expression "Faire"
                  bloc_instructions
                  "FinPour" ;

appel           = identificateur "(" [ expression { "," expression } ] ")" ;

expression      = expression_logique ;
expression_logique = expression_comparaison { ("et" | "ou") expression_comparaison } ;
expression_comparaison = expression_arithmetique
                         [ ("=" | "≠" | "!=" | "<" | ">" | "≤" | "<=" | "≥" | ">=")
                           expression_arithmetique ] ;
expression_arithmetique = terme { ("+" | "-") terme } ;
terme           = facteur { ("*" | "/" | "div" | "mod") facteur } ;
facteur         = nombre | chaine | booléen | identificateur
                | identificateur "[" expression "]"
                | "(" expression ")"
                | "non" facteur
                | "-" facteur ;

nombre          = entier | réel ;
booléen         = "vrai" | "faux" ;

identificateur  = lettre_unicode { lettre_unicode | chiffre | "_" | "'" | "’" } ;
entier          = chiffre { chiffre } ;
réel            = entier ( "." | "," ) entier ;
chaine          = '"' { caractère_échappé | caractère } '"' ;

commentaire     = "//" ... fin_de_ligne
                | "{" ... "}" ;