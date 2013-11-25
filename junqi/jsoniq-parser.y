/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 * @author Corné Oppelaar (github/EaterOfCode)
 */

/*
 * JSONiq Grammar
 */

%lex

%options case-insensitive

digits [0-9]+
esc   "\\"
card  (?:[0-9]|[1-9][0-9]+)
exp   (?:[eE][-+]?[0-9]+)
frac  (?:\.[0-9]+)
ws    [\s]
ncname (?:[A-Za-z][a-zA-Z0-9\_]*)
%%

{card}{frac}?{exp}?\b {
  return 'NUMBER';
}

'"'("\\x"[a-fA-F0-9]{2}|"\\u"[a-fA-F0-9]{4}|"\\"[^xu]|[^"{esc}\n])*'"' {
  yytext = yytext.substr(1,yyleng-2);
  return 'STRING';
}


{ws}+                        /* skip whitespace */
"return"                     return 'RETURN';
"for"                        return 'FOR';
"let"                        return 'LET';
"where"                      return 'WHERE';
"group"                      return 'GROUP';
"stable"                     return 'STABLE';
"order"                      return 'ORDER';
"ascending"                  return 'ASCENDING';
"descending"                 return 'DESCENDING';
"by"                         return 'BY';
"at"                         return 'AT';
"in"                         return 'IN';
"allowing"                   return 'ALLOWING';
"empty"                      return 'EMPTY';
"some"                       return 'SOME';
"every"                      return 'EVERY';
"satisfies"                  return 'SATISFIES';
"case"                       return 'CASE';
"switch"                     return 'SWITCH';
"if"                         return 'IF';
"treat"                      return 'TREAT';
"instance"                   return 'INSTANCE';
"of"                         return 'OF';
"try"                        return 'TRY';
"catch"                      return 'CATCH';
"default"                    return 'DEFAULT';
"or"                         return 'OR';
"and"                        return 'AND';
"not"                        return 'NOT';
"eq"                         return 'EQ';
"ne"                         return 'NE';
"lt"                         return 'LT';
"le"                         return 'LE';
"gt"                         return 'GT';
"ge"                         return 'GE';
"to"                         return 'TO';
"div"                        return 'DIV';
"idiv"                       return 'IDIV';
"mod"                        return 'MOD';
":="                         return 'ASSIGN';
"{"                          return '{';
"}"                          return '}';
"["                          return '[';
"]"                          return ']';
"("                          return '(';
")"                          return ')';
","                          return ',';
"."                          return '.';
":"                          return ':';
"*"                          return '*';
"+"                          return '+';
"-"                          return '-';
"!"                          return '!';
"?"                          return '?';
"$$"                         return '$$';
"$"                          return '$';
{ncname}                     return 'NCNAME';
<<EOF>>                      return 'EOF';

/lex

/* Operator Associativity and Precedence */

%start program

%% /* Parser Grammar */

program
  : expr EOF     { return $1; }
  | EOF          { return []; }
  ;

expr
  : expr ',' exprSingle     { $$ = $1; $1.push($2); }
  | exprSingle              { $$ = [$1]; }
  ;

exprSingle
  : flworExpr
  | quantifiedExpr
  | switchExpr
  | ifExpr
  | tryCatchExpr
  | orExpr
  ;

flworExpr
  : flworHead flworBody flworTail
  | flworHead flworTail
  ;

flworHead
  : forClause
  | letClause
  ;

flworBody
  : flworBody flworClause
  | flworClause
  ;

flworClause
  : forClause
  | letClause
  | whereClause
  | groupByClause
  | orderByClause
  | countClause
  ;

flworTail
  : RETURN primaryExpr
  ;

forClause
  : FOR VarRef forBody
  ;

forBody
  : forBody ',' forParameters
  | forParameters
  ;

forParameters
  : ALLOWING EMPTY AT VarRef IN argument
  | AT VarRef IN argument
  | IN argument
  | ALLOWING EMPTY IN argument
  ;



letClause
  : LET letBody
  ;

letBody
  : letBody ',' VarRef ASSIGN argument
  | VarRef ASSIGN argument
  ;

countClause
  : COUNT VarRef
  ;

whereClause
  : WHERE ExprSingle
  ;

groupByClause
  : GROUP BY groupByBody
  ;

groupByBody
  : groupByBody, VarRef ASSIGN argument
  | groupByBody, argument
  | groupByBody, VarRef
  | VarRef ASSIGN argument
  | VarRef
  | argument
  ;

orderByClause
  : ORDER BY orderByBody
  | STABLE ORDER BY orderByBody
  ;

orderByBody
  : argument 
  | argument orderByType
  | orderByBody ',' argument
  | orderByBody ',' argument orderByType
  ;

orderByType
  : ASCENDING
  | DESCENDING
  ;

quantifiedExpr
  : (SOME | EVERY) VarRef IN ExprSingle (',' VarRef IN ExprSingle)* SATISFIES ExprSingle
  ;

switchExpr
  :SWITCH '(' Expr ')' SwitchCaseClause+ DEFAULT RETURN ExprSingle
  ;

switchCaseClause
  : (CASE ExprSingle)+ RETURN ExprSingle
  ;
ifExpr
  : IF '(' Expr ')' 'then' ExprSingle 'else' ExprSingle
  ;

tryCatchExpr
  : TRY '{' Expr '}' CATCH '*' '{' Expr '}'
  ;

orExpr
  : AndExpr
  | orExpr OR AndExpr
  ;

AndExpr 
  : notExpr
  | AndExpr AND notExpr
  ;

notExpr 
  : NOT ComparisonExpr
  | ComparisonExpr
  ;

ComparisonExpr
  : StringConcatExpr
  | StringConcatExpr EQ StringConcatExpr
  | StringConcatExpr NE StringConcatExpr
  | StringConcatExpr LT StringConcatExpr
  | StringConcatExpr LE StringConcatExpr
  | StringConcatExpr GT StringConcatExpr
  | StringConcatExpr GE StringConcatExpr
  ;

StringConcatExpr
  : RangeExpr
  | StringConcatExpr '||' RangeExpr
  ;

RangeExpr
  : AdditiveExpr
  | AdditiveExpr TO AdditiveExpr
  ;

AdditiveExpr
  : MultiplicativeExpr
  | AdditiveExpr '+' MultiplicativeExpr
  | AdditiveExpr '-' MultiplicativeExpr
  ;

MultiplicativeExpr
  : UnaryExpr
  | MultiplicativeExpr '*' UnaryExpr
  | MultiplicativeExpr DIV UnaryExpr
  | MultiplicativeExpr IDIV UnaryExpr
  | MultiplicativeExpr MOD UnaryExpr
  ;

UnaryExpr
  : SimpleMapExpr
  | '+' UnaryExpr
  | '-' UnaryExpr
  ;

SimpleMapExpr
  : PostfixExpr
  | SimpleMapExpr '!' PostfixExpr
  ;

PostfixExpr
  : argument
  ;

predicate
  : '[' Expr ']'
  ;

objectLookup
  : '.' ( StringLiteral | NCNAME | ParenthesizedExpr | VarRef | ContextItemExpr )
  ;

arrayLookup
  : '[' '[' Expr ']' ']'
  ;

arrayUnboxing
  : '[' ']'
  ;

primaryExpr
  : Literal
  | VarRef
  | ParenthesizedExpr
  | ContextItemExpr
  | FunctionCall
  | OrderedExpr
  | UnorderedExpr
  | ObjectConstructor
  | ArrayConstructor
  ;

literal
  : NumericLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  ;

numericLiteral
  : IntegerLiteral
  | DecimalLiteral
  | DoubleLiteral
  ;

booleanLiteral
  : 'true'
  | 'false'
  ;

nullLiteral
  : 'null'
  ;

VarRef
  : '$' VarRefBody
  ;

VarRefBody 
  : VarRefBody '.' NCNAME
  | NCNAME
  ;

parenthesizedExpr
  : '(' Expr? ')'
  ;

contextItemExpr
  : '$$'  
  ;

orderedExpr
  : 'ordered' '{' Expr '}'
  ;

unorderedExpr
  : 'unordered' '{' Expr '}'
  ;

functionCall
  : NCNAME '(' argumentList ')'
  ;

argument
  : Literal
  | STRING
  | variableChain
  ;

variableChain
  : variableChainStart variableChainBody
  | variableChainStart
  ;

variableChainStart
  : functionCall
  | VarRef
  | contextItemExpr
  ; 

variableChainBody
  : '.' NCNAME
  | '[' orExpr ']'
  | '!' contextItemExpr variableChainBody
  | variableChainBody '[' orExpr ']'
  | variableChainBody '.' NCNAME
  | variableChainBody '!' contextItemExpr variableChainBody
  ;

ObjectConstructor
  : '{' objectBody '}'
  | '{|' Expr '|}'
  ;

objectBody 
  : objectBody ',' pairConstructor
  | pairConstructor
  ;

pairConstructor
  : NCNAME ':' argument
  | STRING ':' argument
  ;

arrayConstructor
  : '[' Expr ']'
  ;

argumentList
  : argumentList ',' orExpr
  | argument
  ;
