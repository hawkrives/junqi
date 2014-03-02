/*!
 * junqi (JavaScript Querying for Node.js)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

/*
 * objeq Grammar
 */
 
%lex

%options case-insensitive

digit [0-9]
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

"'"("\\"['bfvnrt/{esc}]|"\\u"[a-fA-F0-9]{4}|[^'{esc}])*"'" {
  yytext = yytext.substr(1,yyleng-2);
  return 'STRING';
}

"%"[1-9][0-9]* {
  yytext = yytext.substr(1);
  return 'ARGREF';
};

"%"[A-Za-z_$][A-Za-z_$0-9]* {
  yytext = yytext.substr(1);
  return 'PARAM';
}

"#"[^\n]*\n                  /* skip comments */
{ws}+                        /* skip whitespace */
"as"                         return 'AS';
"undefined"                  return 'UNDEFINED';
"null"                       return 'NULL';
"true"                       return 'TRUE';
"false"                      return 'FALSE';
"where"                      return 'WHERE';
"select"                     return 'SELECT';
"expand"                     return 'EXPAND';
"extend"                     return 'EXTEND';
"aggregate"                  return 'AGGREGATE';
("order"{ws}+)?"by"          return 'ORDER_BY';
"group"({ws}+"by")?          return 'GROUP_BY';
"then"                       return 'THEN';
"this"                       return 'THIS';
"asc"                        return 'ASC';
"desc"                       return 'DESC';
"and"                        return 'AND';
"or"                         return 'OR';
"not"                        return 'NOT';
"in"                         return 'IN';
"=="                         return 'EQ';
"!="                         return 'NEQ';
"=~"                         return 'RE';
"<="                         return 'LTE';
">="                         return 'GTE';
"&&"                         return 'AND';
"||"                         return 'OR';
"->"                         return 'SELECT';
"|>"                         return 'EXTEND';
"<:"                         return 'EXPAND';
":="                         return 'AGGREGATE';
"!"                          return 'NOT';
"<"                          return 'LT';
">"                          return 'GT';
"|"                          return 'THEN';
"("                          return '(';
")"                          return ')';
"["                          return '[';
"]"                          return ']';
"{"                          return '{';
"}"                          return '}';
"?"                          return '?';
":"                          return ':';
"."                          return '.';
","                          return ',';
"+"                          return '+';
"-"                          return '-';
"*"                          return '*';
"/"                          return '/';
"%"                          return '%';
[A-Za-z_$][A-Za-z_$0-9]*     return 'IDENT';
<<EOF>>                      return 'EOF';
.                            return 'INVALID';

/lex

/* Operator Associativity and Precedence */

%left '?'
%left OR
%left AND
%left EQ NEQ GT GTE LT LTE IN RE
%left '+' '-'
%left '*' '/' '%'
%left NOT NEG
%left AS
%left '.'

%start query

%% /* Parser Grammar */

query
  : steps EOF     { return $1; }
  | EOF           { return yy.steps(); }
  ;

steps
  : leading_step            { $$ = yy.steps($1); }
  | steps trailing_step     { $$ = yy.stepsPush($1, $2); }
  ;

leading_step
  : non_filter_step
  | leading_filter
  ;

trailing_step
  : THEN non_filter_step     { $$ = $2; }
  | non_filter_step
  | trailing_filter
  ;

leading_filter
  : WHERE expr     { $$ = yy.step('filter', $2); }
  | expr           { $$ = yy.node('filter', $1); }
  ;

trailing_filter
  : WHERE expr     { $$ = yy.step('filter', $2); }
  | THEN expr      { $$ = yy.step('filter', $2); }
  ;

non_filter_step
  : selector
  | sorter
  | grouper
  | aggregator
  ;

expr
  : expr '+' expr      { $$ = yy.node('add', $1, $3); }
  | expr '-' expr      { $$ = yy.node('sub', $1, $3); }
  | expr '*' expr      { $$ = yy.node('mul', $1, $3); }
  | expr '/' expr      { $$ = yy.node('div', $1, $3); }
  | expr '%' expr      { $$ = yy.node('mod', $1, $3); }
  | expr AND expr      { $$ = yy.node('and', $1, $3); }
  | expr OR expr       { $$ = yy.node('or', $1, $3); }
  | expr EQ expr       { $$ = yy.node('eq', $1, $3); }
  | expr NEQ expr      { $$ = yy.node('neq', $1, $3); }
  | expr RE expr       { $$ = yy.node('re', $1, $3); }
  | expr GT expr       { $$ = yy.node('gt', $1, $3); }
  | expr GTE expr      { $$ = yy.node('gte', $1, $3); }
  | expr LT expr       { $$ = yy.node('lt', $1, $3); }
  | expr LTE expr      { $$ = yy.node('lte', $1, $3); }
  | expr IN expr       { $$ = yy.node('in', $1, $3); }
  | expr AS PARAM      { $$ = yy.node('assign', $3, $1); }
  | NOT expr           { $$ = yy.node('not', $2); }
  | '-' expr           %prec NEG { $$ = yy.node('neg', $2); }
  | '(' expr ')'       { $$ = $2; }
  | ternary            
  | call
  | path
  | literal
  ;

ternary
  : expr '?' expr ':' expr     { $$ = yy.node('tern', $1, $3, $5); }
  ;

call
  : IDENT '(' expr_list ')'     { $$ = yy.node('call', $1, $3); }
  | IDENT '(' ')'               { $$ = yy.node('call', $1, yy.list()); }
  ;

path
  : THIS                  { $$ = yy.localPath(); }
  | IDENT                 { $$ = yy.localPath($1); }
  | PARAM                 { $$ = yy.paramPath($1); }
  | ARGREF                { $$ = yy.paramPath(Number($1) - 1); }
  | path '.' IDENT        { $$ = yy.pathPush($1, $3); }
  | path '[' expr ']'     { $$ = yy.pathPush($1, $3); }
  ;

literal
  : NUMBER        { $$ = Number(yytext); }
  | STRING        { $$ = yytext; }
  | TRUE          { $$ = true; }
  | FALSE         { $$ = false; }
  | NULL          { $$ = null; }
  | UNDEFINED     { $$ = undefined; }
  | array
  | obj
  ;

array
  : '[' expr subquery ']'     { $$ = yy.node('subquery', $2, $3); }
  | '[' expr_list ']'         { $$ = yy.node('arr', $2); }
  | '[' ']'                   { $$ = yy.node('arr', yy.list()); }
  ;

subquery
  : trailing_step                    { $$ = yy.steps($1); }
  | trailing_steps trailing_step     { $$ = yy.stepsPush($1, $2); }
  ;

expr_list
  : expr                   { $$ = yy.list($1); }
  | expr_list ',' expr     { $$ = yy.listPush($1, $3); }
  ;

obj
  : '{' obj_items '}'     { $$ = yy.node('obj', $2); }
  | '{' '}'               { $$ = yy.node('obj', yy.map()); }
  ;

obj_items
  : obj_item                   { $$ = yy.map($1); }
  | obj_items ',' obj_item     { $$ = yy.mapPush($1, $3); }
  ;

obj_key_literal
  : NUMBER 
  | STRING 
  | TRUE 
  | FALSE 
  | NULL 
  | UNDEFINED
  ;

obj_item
  : obj_key_literal ':' expr    { $$ = yy.pair($1, $3); }
  | IDENT ':' expr              { $$ = yy.pair($1, $3); }
  | IDENT                       { $$ = yy.pair($1, yy.localPath($1)); }
  ;

selector
  : EXPAND expr       { $$ = yy.step('expand', $2); }
  | SELECT expr_list  { $$ = yy.step('select', $2); }
  | EXTEND expr_list  { $$ = yy.step('extend', $2); }
  ;

sorter
  : ORDER_BY order_list     { $$ = yy.step('sort', $2); }
  ;

order_list
  : order_spec                    { $$ = yy.list($1); }
  | order_list ',' order_spec     { $$ = yy.listPush($1, $3); }
  ;

order_spec
  : expr          { $$ = yy.ascending($1); }
  | expr ASC      { $$ = yy.ascending($1); }
  | expr DESC     { $$ = yy.descending($1); }
  ;

grouper
  : GROUP_BY expr_list     { $$ = yy.step('group', $2); }
  ;

aggregator
  : AGGREGATE aggr_list     { $$ = yy.step('aggregate', $2); }
  ;

aggr_list
  : IDENT                   { $$ = yy.list($1); }
  | aggr_list ',' IDENT     { $$ = yy.listPush($1, $3); }
  ;
