grammar Language;

prog
    : stmt*                                                     # R1
    ;

stmt
    : 'int' I=ID ';'                                            # R2
      //> '(define `I` 0)'
    | I=ID '=' e=expr ';'                                       # R3
      //> '(set! `I` `e`)'
    | 'while' e=expr 'do' s=stmt 'done'                         # R4
      //> '(define (f)\n  (if (not (= `e` 0))\n      (begin\n`[8]s`)\n      (void)))\n(f)'
    | '{' ss=prog '}'                                           # R5
      //> '`ss`'
    | 'print' e=expr ';'                                        # R6
      //> '(displayln `e`)'
    ;

expr
    : l=expr '+' r=expr                                         # R8
      //> '(+ `l` `r`)'
    | l=expr '-' r=expr                                         # R9
      //> '(- `l` `r`)'
    | ID                                                        # R10
    | INT                                                       # R11
    | '(' e=expr ')'                                            # R12
      //> '`e`'
    ;

ID
    : [A-Za-z]+
    ;

INT
    : [0-9]+
    ;

WS
    : [ \t\r\n] -> skip
    ;
