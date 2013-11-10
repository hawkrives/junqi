/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
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

%%

{card}{frac}?{exp}?\b {
  return 'NUMBER';
}

'"'("\\x"[a-fA-F0-9]{2}|"\\u"[a-fA-F0-9]{4}|"\\"[^xu]|[^"{esc}\n])*'"' {
  yytext = yytext.substr(1,yyleng-2);
  return 'STRING';
}

"(:"(.*)":)"  {
  return 'COMMENT';
}

{ws}+                        /* skip whitespace */
"return"                     return 'RETURN';
"for"                        return 'FOR';
"let"                        return 'LET';
"count"                      return 'COUNT';
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
"*"                          return '*';
"+"                          return '+';
"-"                          return '-';
"!"                          return '!';
"?"                          return '?';
"$"                          return '$';

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
  : flowrHead flworBody flowrTail
  | flowrHead flowrTail
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
  : RETURN exprSingle
  ;

forClause
         ::= FOR VarRef (ALLOWING EMPTY)? (AT VarRef)? IN ExprSingle ("," VarRef (ALLOWING EMPTY)? (AT VarRef)? IN ExprSingle)*
letClause
         ::= LET VarRef ASSIGN ExprSingle (',' VarRef ASSIGN ExprSingle)*
countClause
         ::= COUNT VarRef
whereClause
         ::= WHERE ExprSingle
groupByClause
         ::= GROUP BY VarRef (ASSIGN ExprSingle)? (',' VarRef (ASSIGN ExprSingle)?)*
orderByClause
         ::= ((ORDER BY) | (STABLE ORDER BY)) ExprSingle (ASCENDING | DESCENDING)? ('empty' ('greatest' | 'least'))? (',' ExprSingle (ASCENDING | DESCENDING)? ('empty' ('greatest' | 'least'))?)*
quantifiedExpr
         ::= (SOME | EVERY) VarRef IN ExprSingle (',' VarRef IN ExprSingle)* SATISFIES ExprSingle
switchExpr
         ::= SWITCH '(' Expr ')' SwitchCaseClause+ DEFAULT RETURN ExprSingle
switchCaseClause
         ::= (CASE ExprSingle)+ RETURN ExprSingle
ifExpr   ::= IF '(' Expr ')' 'then' ExprSingle 'else' ExprSingle
tryCatchExpr
         ::= TRY '{' Expr '}' CATCH '*' '{' Expr '}'
orExpr   ::= AndExpr ( OR AndExpr )*
andExpr  ::= NotExpr ( AND NotExpr )*
notExpr  ::= NOT? ComparisonExpr
comparisonExpr
         ::= StringConcatExpr ( (EQ | NE | LT | LE | GT | GE) StringConcatExpr )?
stringConcatExpr
         ::= RangeExpr ( '||' RangeExpr )*
rangeExpr
         ::= AdditiveExpr ( TO AdditiveExpr )?
additiveExpr
         ::= MultiplicativeExpr ( ('+' | '-') MultiplicativeExpr )*
multiplicativeExpr
         ::= UnaryExpr ( ('*' | DIV | IDIV | MOD ) UnaryExpr )*
unaryExpr
         ::= ('-' | '+')* SimpleMapExpr
simpleMapExpr
         ::= PostfixExpr ('!' PostfixExpr)*
postfixExpr
         ::= PrimaryExpr (Predicate | ObjectLookup | ArrayLookup | ArrayUnboxing)*
predicate
         ::= '[' Expr ']'
objectLookup
         ::= '.' ( StringLiteral | NCName | ParenthesizedExpr | VarRef | ContextItemExpr )
arrayLookup
         ::= '[' '[' Expr ']' ']'
arrayUnboxing
         ::= '[' ']'
primaryExpr
         ::= Literal
           | VarRef
           | ParenthesizedExpr
           | ContextItemExpr
           | FunctionCall
           | OrderedExpr
           | UnorderedExpr
           | ObjectConstructor
           | ArrayConstructor
           
literal  ::= NumericLiteral | StringLiteral | BooleanLiteral | NullLiteral

numericLiteral
         ::= IntegerLiteral | DecimalLiteral | DoubleLiteral

booleanLiteral
         ::= 'true' | 'false'

nullLiteral
         ::= 'null'

varRef   ::= '$' (NCName ':')? NCName

parenthesizedExpr
         ::= '(' Expr? ')'

contextItemExpr
         ::= '$$'

orderedExpr
         ::= 'ordered' '{' Expr '}'

unorderedExpr
         ::= 'unordered' '{' Expr '}'

functionCall
         ::= (NCName ':')? NCName ArgumentList

argument ::= exprSingle | '?'

objectConstructor
         ::=  '{' ( PairConstructor (',' PairConstructor)* )? '}'
         | '{|' Expr '|}'

pairConstructor
         ::=  ( ExprSingle | NCName ) ':' ExprSingle

arrayConstructor
         ::=  '[' Expr? ']'
